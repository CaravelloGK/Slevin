import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DealerPanel } from '@/components/dealer/dealer-panel'
import type { BlindLevel, TournamentPlayerWithProfile } from '@/types/tournament'

interface Props {
  params: Promise<{ id: string }>
}

interface BlindLevelOverride {
  level_number: number
  small_blind: number
  big_blind: number
  ante: number
  duration_minutes: number
}

export default async function DealerPanelPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch tournament (include blind_level_overrides for per-tournament structure edits)
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select(
      'id, name, status, bounty_amount, entry_fee, prize_distribution, current_level, level_started_at, started_at, finished_at, blind_structure_id, created_at, poster_url, blind_level_overrides',
    )
    .eq('id', id)
    .single()

  if (tournamentError || !tournament) {
    notFound()
  }

  // Fetch base blind levels for this tournament's structure
  const { data: baseLevels } = await supabase
    .from('blind_levels')
    .select('id, blind_structure_id, level_number, small_blind, big_blind, ante, duration_minutes, is_break')
    .eq('blind_structure_id', tournament.blind_structure_id)
    .order('level_number', { ascending: true })
    .limit(50)

  // Apply per-tournament overrides on top of the base structure
  const overrides = ((tournament.blind_level_overrides ?? []) as unknown as BlindLevelOverride[])
  const blindLevels: BlindLevel[] = (baseLevels ?? []).map((level) => {
    const override = overrides.find((o) => o.level_number === level.level_number)
    if (!override) return level
    return {
      ...level,
      small_blind: override.small_blind,
      big_blind: override.big_blind,
      ante: override.ante,
      duration_minutes: override.duration_minutes,
    }
  })

  // Fetch tournament players with player profile
  const { data: rawPlayers } = await supabase
    .from('tournament_players')
    .select(
      `id, registered_at, tournament_id, player_id, seat_number, status, current_bounty,
       guaranteed_bounty, rebuy_count, eliminated_at, final_position,
       player:players(id, created_at, name, nickname, avatar_url, user_id)`,
    )
    .eq('tournament_id', id)
    .order('seat_number', { ascending: true })
    .limit(100)

  const players = (rawPlayers ?? []) as TournamentPlayerWithProfile[]

  return (
    <DealerPanel
      initialTournament={tournament}
      initialPlayers={players}
      blindLevels={blindLevels}
    />
  )
}
