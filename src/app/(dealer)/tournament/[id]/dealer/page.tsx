import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DealerPanel } from '@/components/dealer/dealer-panel'
import type { TournamentPlayerWithProfile } from '@/types/tournament'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DealerPanelPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select(
      'id, name, status, bounty_amount, current_level, level_started_at, blind_structure_id, created_at',
    )
    .eq('id', id)
    .single()

  if (tournamentError || !tournament) {
    notFound()
  }

  // Fetch blind levels for this tournament's structure
  const { data: blindLevels } = await supabase
    .from('blind_levels')
    .select('id, blind_structure_id, level_number, small_blind, big_blind, ante, duration_minutes, is_break')
    .eq('blind_structure_id', tournament.blind_structure_id)
    .order('level_number', { ascending: true })
    .limit(50)

  // Fetch tournament players with player profile
  const { data: rawPlayers } = await supabase
    .from('tournament_players')
    .select(
      `id, registered_at, tournament_id, player_id, seat_number, status, current_bounty,
       guaranteed_bounty, rebuy_count, eliminated_at, final_position,
       player:players(id, created_at, name, nickname, avatar_url)`,
    )
    .eq('tournament_id', id)
    .order('seat_number', { ascending: true })
    .limit(100)

  const players = (rawPlayers ?? []) as TournamentPlayerWithProfile[]

  return (
    <DealerPanel
      initialTournament={tournament}
      initialPlayers={players}
      blindLevels={blindLevels ?? []}
    />
  )
}
