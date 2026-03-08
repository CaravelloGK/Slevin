'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/api'

// ---- Auth guard -------------------------------------------------------------

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user || user.user_metadata?.role !== 'admin') {
    return { user: null, supabase: null }
  }
  return { user, supabase }
}

// ---- Player actions ---------------------------------------------------------

const createPlayerSchema = z.object({
  name: z.string().min(1).max(100),
  nickname: z.string().max(50).optional(),
})

const updatePlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  nickname: z.string().max(50).optional(),
})

export async function createPlayer(
  input: z.infer<typeof createPlayerSchema>,
): Promise<ApiResponse<{ id: string }>> {
  const parsed = createPlayerSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { supabase } = await requireAdmin()
  if (!supabase) return { success: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('players')
    .insert({
      name: parsed.data.name,
      nickname: parsed.data.nickname ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: 'Failed to create player' }

  revalidatePath('/admin/players')
  return { success: true, data: { id: data.id } }
}

export async function updatePlayer(
  input: z.infer<typeof updatePlayerSchema>,
): Promise<ApiResponse<null>> {
  const parsed = updatePlayerSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { supabase } = await requireAdmin()
  if (!supabase) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('players')
    .update({
      name: parsed.data.name,
      nickname: parsed.data.nickname ?? null,
    })
    .eq('id', parsed.data.id)

  if (error) return { success: false, error: 'Failed to update player' }

  revalidatePath('/admin/players')
  return { success: true, data: null }
}

// ---- Tournament actions -----------------------------------------------------

const prizePlaceSchema = z.object({
  position: z.number().int().min(1),
  percentage: z.number().int().min(1).max(100),
})

const createTournamentSchema = z.object({
  name: z.string().min(1).max(200),
  bounty_amount: z.number().int().min(0),
  entry_fee: z.number().int().min(0).default(0),
  prize_distribution: z.array(prizePlaceSchema).default([]),
  blind_structure_id: z.string().uuid(),
})

export async function createTournament(
  input: z.infer<typeof createTournamentSchema>,
): Promise<ApiResponse<{ id: string }>> {
  const parsed = createTournamentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user, supabase } = await requireAdmin()
  if (!user || !supabase) return { success: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name: parsed.data.name,
      bounty_amount: parsed.data.bounty_amount,
      entry_fee: parsed.data.entry_fee,
      prize_distribution: parsed.data.prize_distribution,
      blind_structure_id: parsed.data.blind_structure_id,
      status: 'pending',
      current_level: 1,
    })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: 'Failed to create tournament' }

  revalidatePath('/admin/tournaments')
  return { success: true, data: { id: data.id } }
}

// ---- Blind structure actions ------------------------------------------------

const createStructureSchema = z.object({
  name: z.string().min(1).max(200),
})

const blindLevelSchema = z.object({
  blind_structure_id: z.string().uuid(),
  level_number: z.number().int().min(1),
  small_blind: z.number().int().min(1),
  big_blind: z.number().int().min(1),
  ante: z.number().int().min(0),
  duration_minutes: z.number().int().min(1),
})

const deleteBlindLevelSchema = z.object({
  id: z.string().uuid(),
  blind_structure_id: z.string().uuid(),
})

export async function createBlindStructure(
  input: z.infer<typeof createStructureSchema>,
): Promise<ApiResponse<{ id: string }>> {
  const parsed = createStructureSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { supabase } = await requireAdmin()
  if (!supabase) return { success: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('blind_structures')
    .insert({ name: parsed.data.name })
    .select('id')
    .single()

  if (error || !data) return { success: false, error: 'Не удалось создать структуру' }

  revalidatePath('/admin/structures')
  return { success: true, data: { id: data.id } }
}

export async function addBlindLevel(
  input: z.infer<typeof blindLevelSchema>,
): Promise<ApiResponse<null>> {
  const parsed = blindLevelSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { supabase } = await requireAdmin()
  if (!supabase) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('blind_levels').insert({
    blind_structure_id: parsed.data.blind_structure_id,
    level_number: parsed.data.level_number,
    small_blind: parsed.data.small_blind,
    big_blind: parsed.data.big_blind,
    ante: parsed.data.ante,
    duration_minutes: parsed.data.duration_minutes,
  })

  if (error) return { success: false, error: 'Не удалось добавить уровень' }

  revalidatePath('/admin/structures')
  return { success: true, data: null }
}

export async function deleteBlindLevel(
  input: z.infer<typeof deleteBlindLevelSchema>,
): Promise<ApiResponse<null>> {
  const parsed = deleteBlindLevelSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { supabase } = await requireAdmin()
  if (!supabase) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('blind_levels')
    .delete()
    .eq('id', parsed.data.id)
    .eq('blind_structure_id', parsed.data.blind_structure_id)

  if (error) return { success: false, error: 'Failed to delete level' }

  revalidatePath('/admin/structures')
  return { success: true, data: null }
}

// ---- Player registration ----------------------------------------------------

const registerPlayerSchema = z.object({
  tournament_id: z.string().uuid(),
  player_id: z.string().uuid(),
})

const removePlayerSchema = z.object({
  tournament_id: z.string().uuid(),
  player_id: z.string().uuid(),
})

const startTournamentSchema = z.object({
  tournament_id: z.string().uuid(),
})

export async function registerPlayer(
  input: z.infer<typeof registerPlayerSchema>,
): Promise<ApiResponse<null>> {
  const parsed = registerPlayerSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user, supabase } = await requireAdmin()
  if (!user || !supabase) return { success: false, error: 'Unauthorized' }

  // Fetch bounty_amount from tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('bounty_amount, status')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (tErr || !tournament) return { success: false, error: 'Tournament not found' }
  if (tournament.status !== 'pending') return { success: false, error: 'Tournament already started' }

  const { error: insertErr } = await supabase.from('tournament_players').insert({
    tournament_id: parsed.data.tournament_id,
    player_id: parsed.data.player_id,
    current_bounty: tournament.bounty_amount,
    guaranteed_bounty: 0,
    status: 'active',
  })

  if (insertErr) {
    if (insertErr.code === '23505') return { success: false, error: 'Player already registered' }
    return { success: false, error: 'Failed to register player' }
  }

  await supabase.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'player.registered',
    actor_player_id: user.id,
    data_json: { player_id: parsed.data.player_id, bounty: tournament.bounty_amount },
    source: 'system',
  })

  revalidatePath(`/admin/tournaments/${parsed.data.tournament_id}/register`)
  return { success: true, data: null }
}

export async function removePlayerFromTournament(
  input: z.infer<typeof removePlayerSchema>,
): Promise<ApiResponse<null>> {
  const parsed = removePlayerSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { supabase } = await requireAdmin()
  if (!supabase) return { success: false, error: 'Unauthorized' }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (tournament?.status !== 'pending') return { success: false, error: 'Tournament already started' }

  const { error } = await supabase
    .from('tournament_players')
    .delete()
    .eq('tournament_id', parsed.data.tournament_id)
    .eq('player_id', parsed.data.player_id)

  if (error) return { success: false, error: 'Failed to remove player' }

  revalidatePath(`/admin/tournaments/${parsed.data.tournament_id}/register`)
  return { success: true, data: null }
}

export async function startTournament(
  input: z.infer<typeof startTournamentSchema>,
): Promise<ApiResponse<null>> {
  const parsed = startTournamentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const { user, supabase } = await requireAdmin()
  if (!user || !supabase) return { success: false, error: 'Unauthorized' }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', parsed.data.tournament_id)
    .single()

  if (tournament?.status !== 'pending') return { success: false, error: 'Tournament cannot be started' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tournaments')
    .update({ status: 'running', level_started_at: now, started_at: now })
    .eq('id', parsed.data.tournament_id)

  if (error) return { success: false, error: 'Failed to start tournament' }

  await supabase.from('tournament_logs').insert({
    tournament_id: parsed.data.tournament_id,
    event_type: 'tournament.started',
    actor_player_id: user.id,
    data_json: {},
    source: 'system',
  })

  revalidatePath('/admin/tournaments')
  return { success: true, data: null }
}
