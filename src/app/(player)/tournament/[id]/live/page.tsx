import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { SpectatorPanel } from '@/components/spectator/spectator-panel'
import type { TournamentPlayerWithProfile } from '@/types/tournament'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LivePage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select(
      'id, name, status, bounty_amount, entry_fee, prize_distribution, current_level, level_started_at, started_at, finished_at, blind_structure_id, created_at, poster_url',
    )
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  // Pending → back to lobby
  if (tournament.status === 'pending') {
    redirect(`/tournament/${id}`)
  }

  const { data: blindLevels } = await supabase
    .from('blind_levels')
    .select(
      'id, blind_structure_id, level_number, small_blind, big_blind, ante, duration_minutes, is_break',
    )
    .eq('blind_structure_id', tournament.blind_structure_id)
    .order('level_number', { ascending: true })
    .limit(50)

  const { data: rawPlayers } = await supabase
    .from('tournament_players')
    .select(
      `id, registered_at, tournament_id, player_id, seat_number, status, current_bounty,
       guaranteed_bounty, rebuy_count, eliminated_at, final_position,
       player:players(id, name, nickname, avatar_url, user_id)`,
    )
    .eq('tournament_id', id)
    .limit(200)

  const players = (rawPlayers ?? []) as TournamentPlayerWithProfile[]

  return (
    <SpectatorPanel
      initialTournament={tournament}
      initialPlayers={players}
      blindLevels={blindLevels ?? []}
    />
  )
}
