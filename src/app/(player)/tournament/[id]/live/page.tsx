import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { SpectatorPanel } from '@/components/spectator/spectator-panel'
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
      'id, name, status, bounty_amount, entry_fee, prize_distribution, current_level, level_started_at, started_at, finished_at, blind_structure_id, created_at, poster_url, blind_level_overrides, dealer_player_id',
    )
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  // Pending → back to lobby
  if (tournament.status === 'pending') {
    redirect(`/tournament/${id}`)
  }

  // Fetch base blind levels
  const { data: baseLevels } = await supabase
    .from('blind_levels')
    .select(
      'id, blind_structure_id, level_number, small_blind, big_blind, ante, duration_minutes, is_break',
    )
    .eq('blind_structure_id', tournament.blind_structure_id)
    .order('level_number', { ascending: true })
    .limit(50)

  // Apply per-tournament overrides (same merge logic as dealer page)
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

  let livePlayersQuery = supabase
    .from('tournament_players')
    .select(
      `id, registered_at, tournament_id, player_id, seat_number, status, current_bounty,
       guaranteed_bounty, rebuy_count, kills_count, eliminated_at, final_position,
       player:players(id, created_at, name, nickname, avatar_url, user_id)`,
    )
    .eq('tournament_id', id)
    .limit(200)

  if (tournament.dealer_player_id) {
    livePlayersQuery = livePlayersQuery.neq('player_id', tournament.dealer_player_id)
  }

  const { data: rawPlayers } = await livePlayersQuery
  const players = (rawPlayers ?? []) as TournamentPlayerWithProfile[]

  return (
    <SpectatorPanel
      initialTournament={tournament}
      initialPlayers={players}
      blindLevels={blindLevels}
    />
  )
}
