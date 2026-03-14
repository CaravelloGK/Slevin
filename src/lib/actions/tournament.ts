'use server'

import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types/api'
import type { Database } from '@/types/database.types'

function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---- Schemas ----------------------------------------------------------------

const adjustPlayerCardSchema = z.object({
  tournament_player_id: z.string().uuid(),
  tournament_id: z.string().uuid(),
  current_bounty: z.number().int().min(0),
  guaranteed_bounty: z.number().int().min(0),
  rebuy_count: z.number().int().min(0),
  seat_number: z.number().int().min(1).max(200).nullable().optional(),
  status: z.enum(['active', 'eliminated', 'winner']),
})

const blindLevelOverrideItem = z.object({
  level_number: z.number().int().min(1),
  small_blind: z.number().int().min(0),
  big_blind: z.number().int().min(0),
  ante: z.number().int().min(0),
  duration_minutes: z.number().int().min(1),
})

const updateBlindOverridesSchema = z.object({
  tournament_id: z.string().uuid(),
  overrides: z.array(blindLevelOverrideItem),
})

const jumpToLevelSchema = z.object({
  tournament_id: z.string().uuid(),
  target_level: z.number().int().min(1),
})

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

const endTournamentSchema = z.object({
  tournament_id: z.string().uuid(),
})

// ---- Helpers ----------------------------------------------------------------

async function revertDealerRole(db: ReturnType<typeof createServiceClient>, tournamentId: string) {
  const { data: t } = await db
    .from('tournaments')
    .select('dealer_player_id')
    .eq('id', tournamentId)
    .single()

  if (!t?.dealer_player_id) return

  const { data: dealerPlayer } = await db
    .from('players')
    .select('user_id')
    .eq('id', t.dealer_player_id)
    .single()

  if (dealerPlayer?.user_id) {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(dealerPlayer.user_id, {
      user_metadata: { role: 'player' },
    })
  }
}

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

  // Auto-end when exactly 1 competing player remains (dealer excluded)
  const { data: tournamentRow } = await db
    .from('tournaments')
    .select('dealer_player_id')
    .eq('id', parsed.data.tournament_id)
    .single()

  let activeQuery = db
    .from('tournament_players')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', parsed.data.tournament_id)
    .eq('status', 'active')

  if (tournamentRow?.dealer_player_id) {
    activeQuery = activeQuery.neq('player_id', tournamentRow.dealer_player_id)
  }

  const { count } = await activeQuery

  if (count === 1) {
    await db.rpc('process_end_tournament', {
      p_tournament_id: parsed.data.tournament_id,
      p_actor_id: null,
    })
    await revertDealerRole(db, parsed.data.tournament_id)
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

  const { user } = await getAuthorizedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = createServiceClient()

  // Store exact seconds remaining at pause time so the client can read it
  // directly on page refresh — avoids drift caused by wall-clock advancing while paused.
  const update: Record<string, unknown> = {
    status: 'paused',
    paused_seconds_remaining: parsed.data.seconds_remaining ?? null,
  }

  const { error } = await db
    .from('tournaments')
    .update(update)
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to pause' }

  await db.from('tournament_logs').insert({
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

  const { user } = await getAuthorizedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = createServiceClient()

  // Read the frozen seconds from the DB (set at pause time) so the resumed
  // level_started_at is authoritative and not subject to client clock drift.
  let levelStartedAt = new Date().toISOString()
  const { data: tournament } = await db
    .from('tournaments')
    .select('current_level, blind_structure_id, paused_seconds_remaining')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (tournament) {
    const secondsRemaining =
      tournament.paused_seconds_remaining ?? parsed.data.seconds_remaining

    if (secondsRemaining !== undefined && secondsRemaining !== null) {
      const { data: level } = await db
        .from('blind_levels')
        .select('duration_minutes')
        .eq('blind_structure_id', tournament.blind_structure_id)
        .eq('level_number', tournament.current_level)
        .single()

      if (level) {
        const elapsed = level.duration_minutes * 60 - secondsRemaining
        levelStartedAt = new Date(Date.now() - elapsed * 1000).toISOString()
      }
    }
  }

  const { error } = await db
    .from('tournaments')
    .update({ status: 'running', level_started_at: levelStartedAt, paused_seconds_remaining: null })
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to resume' }

  await db.from('tournament_logs').insert({
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

  const { user } = await getAuthorizedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = createServiceClient()

  const { data: tournament, error: fetchError } = await db
    .from('tournaments')
    .select('current_level')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (fetchError || !tournament) return { success: false, error: 'Tournament not found' }

  const delta = parsed.data.direction === 'next' ? 1 : -1
  const newLevel = Math.max(1, tournament.current_level + delta)

  const { error } = await db
    .from('tournaments')
    .update({
      current_level: newLevel,
      level_started_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to advance level' }

  await db.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'timer.level_advanced',
    actor_player_id: user.id,
    data_json: { from_level: tournament.current_level, to_level: newLevel },
    source: 'dealer',
  })

  return { success: true, data: { new_level: newLevel } }
}

export async function adjustPlayerCard(
  input: z.infer<typeof adjustPlayerCardSchema>,
): Promise<ApiResponse<{ message: string }>> {
  const parsed = adjustPlayerCardSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user } = await getAuthorizedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = createServiceClient()

  const updatePayload: Record<string, unknown> = {
    current_bounty: parsed.data.current_bounty,
    guaranteed_bounty: parsed.data.guaranteed_bounty,
    rebuy_count: parsed.data.rebuy_count,
    status: parsed.data.status,
  }
  if (parsed.data.seat_number !== undefined) {
    updatePayload.seat_number = parsed.data.seat_number
  }

  const { error } = await db
    .from('tournament_players')
    .update(updatePayload)
    .eq('id', parsed.data.tournament_player_id)
    .eq('tournament_id', parsed.data.tournament_id)

  if (error) return { success: false, error: error.message, code: 'DB_ERROR' }

  await db.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'player.bounty_adjusted',
    actor_player_id: null,
    data_json: {
      tournament_player_id: parsed.data.tournament_player_id,
      current_bounty: parsed.data.current_bounty,
      guaranteed_bounty: parsed.data.guaranteed_bounty,
      rebuy_count: parsed.data.rebuy_count,
      seat_number: parsed.data.seat_number ?? null,
      status: parsed.data.status,
      by_user: user.id,
    },
    source: 'dealer',
  })

  return { success: true, data: { message: 'ok' } }
}

export async function updateBlindLevelOverrides(
  input: z.infer<typeof updateBlindOverridesSchema>,
): Promise<ApiResponse<{ message: string }>> {
  const parsed = updateBlindOverridesSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user } = await getAuthorizedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = createServiceClient()

  const { error } = await db
    .from('tournaments')
    .update({ blind_level_overrides: parsed.data.overrides })
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: error.message, code: 'DB_ERROR' }

  await db.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'timer.level_advanced',
    actor_player_id: null,
    data_json: {
      action: 'structure_override',
      override_count: parsed.data.overrides.length,
      by_user: user.id,
    },
    source: 'dealer',
  })

  return { success: true, data: { message: 'ok' } }
}

export async function jumpToLevel(
  input: z.infer<typeof jumpToLevelSchema>,
): Promise<ApiResponse<{ new_level: number }>> {
  const parsed = jumpToLevelSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user } = await getAuthorizedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = createServiceClient()

  const { data: tournament, error: fetchError } = await db
    .from('tournaments')
    .select('current_level')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (fetchError || !tournament) return { success: false, error: 'Tournament not found' }

  const { error } = await db
    .from('tournaments')
    .update({
      current_level: parsed.data.target_level,
      level_started_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to jump to level' }

  await db.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'timer.level_advanced',
    actor_player_id: null,
    data_json: {
      from_level: tournament.current_level,
      to_level: parsed.data.target_level,
      action: 'jump',
      by_user: user.id,
    },
    source: 'dealer',
  })

  return { success: true, data: { new_level: parsed.data.target_level } }
}

export async function endTournament(
  input: z.infer<typeof endTournamentSchema>,
): Promise<ApiResponse<{ message: string }>> {
  const parsed = endTournamentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user } = await getAuthorizedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = createServiceClient()

  // Verify tournament is in a finishable state
  const { data: tournament, error: fetchError } = await db
    .from('tournaments')
    .select('status')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (fetchError || !tournament) return { success: false, error: 'Tournament not found' }
  if (tournament.status === 'finished') return { success: false, error: 'Tournament already finished' }
  if (tournament.status === 'pending') return { success: false, error: 'Tournament has not started' }

  const { error } = await db.rpc('process_end_tournament', {
    p_tournament_id: parsed.data.tournament_id,
    p_actor_id: null,
  })

  if (error) return { success: false, error: error.message, code: 'DB_ERROR' }

  await revertDealerRole(db, parsed.data.tournament_id)

  return { success: true, data: { message: 'ok' } }
}
