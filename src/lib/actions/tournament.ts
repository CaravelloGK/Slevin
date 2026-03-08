'use server'

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/api'
import type { Database } from '@/types/database.types'

function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---- Schemas ----------------------------------------------------------------

const knockoutSchema = z.object({
  tournament_id: z.string().uuid(),
  killer_id: z.string().uuid(),
  victim_id: z.string().uuid(),
})

const rebuySchema = z.object({
  tournament_id: z.string().uuid(),
  player_id: z.string().uuid(),
})

const timerControlSchema = z.object({
  tournament_id: z.string().uuid(),
  seconds_remaining: z.number().int().min(0).optional(),
})

const advanceLevelSchema = z.object({
  tournament_id: z.string().uuid(),
  direction: z.enum(['next', 'prev']),
})

// ---- Helpers ----------------------------------------------------------------

async function getAuthorizedUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { user: null, supabase: null }
  const role = user.user_metadata?.role as string | undefined
  if (role !== 'admin' && role !== 'dealer') return { user: null, supabase: null }
  return { user, supabase }
}

// ---- Actions ----------------------------------------------------------------

export async function recordKnockout(
  input: z.infer<typeof knockoutSchema>,
): Promise<ApiResponse<{ message: string }>> {
  const parsed = knockoutSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { user } = await getAuthorizedUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const db = createServiceClient()
  const { error } = await db.rpc('process_knockout', {
    p_tournament_id: parsed.data.tournament_id,
    p_killer_id: parsed.data.killer_id,
    p_victim_id: parsed.data.victim_id,
    p_actor_id: null,
  })

  if (error) {
    return { success: false, error: error.message, code: 'DB_ERROR' }
  }

  return { success: true, data: { message: 'ok' } }
}

export async function recordRebuy(
  input: z.infer<typeof rebuySchema>,
): Promise<ApiResponse<{ message: string }>> {
  const parsed = rebuySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { user } = await getAuthorizedUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const db = createServiceClient()
  const { error } = await db.rpc('process_rebuy', {
    p_tournament_id: parsed.data.tournament_id,
    p_player_id: parsed.data.player_id,
    p_actor_id: null,
  })

  if (error) {
    return { success: false, error: error.message, code: 'DB_ERROR' }
  }

  return { success: true, data: { message: 'ok' } }
}

export async function pauseTimer(
  input: z.infer<typeof timerControlSchema>,
): Promise<ApiResponse<null>> {
  const parsed = timerControlSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user, supabase } = await getAuthorizedUser()
  if (!user || !supabase) return { success: false, error: 'Unauthorized' }

  // Build update: always set status=paused.
  // If seconds_remaining is provided, shift level_started_at so the frozen
  // time survives a page refresh (computeSecondsLeft will return the same value).
  const update: Record<string, unknown> = { status: 'paused' }
  if (parsed.data.seconds_remaining !== undefined) {
    const { data: levelData } = await supabase
      .from('tournaments')
      .select('current_level, blind_structure_id')
      .eq('id', parsed.data.tournament_id)
      .single()

    if (levelData) {
      const { data: level } = await supabase
        .from('blind_levels')
        .select('duration_minutes')
        .eq('blind_structure_id', levelData.blind_structure_id)
        .eq('level_number', levelData.current_level)
        .single()

      if (level) {
        const elapsed = level.duration_minutes * 60 - parsed.data.seconds_remaining
        update.level_started_at = new Date(Date.now() - elapsed * 1000).toISOString()
      }
    }
  }

  const { error } = await supabase
    .from('tournaments')
    .update(update)
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to pause' }

  await supabase.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'timer.paused',
    actor_player_id: user.id,
    data_json: { seconds_remaining: parsed.data.seconds_remaining ?? null },
    source: 'dealer',
  })

  return { success: true, data: null }
}

export async function resumeTimer(
  input: z.infer<typeof timerControlSchema>,
): Promise<ApiResponse<null>> {
  const parsed = timerControlSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user, supabase } = await getAuthorizedUser()
  if (!user || !supabase) return { success: false, error: 'Unauthorized' }

  // Calculate effective level_started_at accounting for paused time
  let levelStartedAt = new Date().toISOString()
  if (parsed.data.seconds_remaining !== undefined) {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('current_level, blind_structure_id')
      .eq('id', parsed.data.tournament_id)
      .single()

    if (tournament) {
      const { data: level } = await supabase
        .from('blind_levels')
        .select('duration_minutes')
        .eq('blind_structure_id', tournament.blind_structure_id)
        .eq('level_number', tournament.current_level)
        .single()

      if (level) {
        const elapsed = level.duration_minutes * 60 - parsed.data.seconds_remaining
        const effectiveStart = new Date(Date.now() - elapsed * 1000)
        levelStartedAt = effectiveStart.toISOString()
      }
    }
  }

  const { error } = await supabase
    .from('tournaments')
    .update({ status: 'running', level_started_at: levelStartedAt })
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to resume' }

  await supabase.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'timer.resumed',
    actor_player_id: user.id,
    data_json: {},
    source: 'dealer',
  })

  return { success: true, data: null }
}

export async function advanceLevel(
  input: z.infer<typeof advanceLevelSchema>,
): Promise<ApiResponse<{ new_level: number }>> {
  const parsed = advanceLevelSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user, supabase } = await getAuthorizedUser()
  if (!user || !supabase) return { success: false, error: 'Unauthorized' }

  const { data: tournament, error: fetchError } = await supabase
    .from('tournaments')
    .select('current_level')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (fetchError || !tournament) return { success: false, error: 'Tournament not found' }

  const delta = parsed.data.direction === 'next' ? 1 : -1
  const newLevel = Math.max(1, tournament.current_level + delta)

  const { error } = await supabase
    .from('tournaments')
    .update({
      current_level: newLevel,
      level_started_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to advance level' }

  await supabase.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'timer.level_advanced',
    actor_player_id: user.id,
    data_json: { from_level: tournament.current_level, to_level: newLevel },
    source: 'dealer',
  })

  return { success: true, data: { new_level: newLevel } }
}
