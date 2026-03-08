import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { PlayerRegistration } from '@/components/admin/player-registration'
import type { TournamentPlayerWithProfile } from '@/types/tournament'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RegisterPlayersPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()

  const [
    { data: tournament, error: tErr },
    { data: allPlayers },
    { data: rawRegistered },
  ] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, created_at, name, status, bounty_amount, entry_fee, prize_distribution, current_level, level_started_at, started_at, finished_at, blind_structure_id')
      .eq('id', id)
      .single(),
    supabase
      .from('players')
      .select('id, created_at, name, nickname, avatar_url')
      .order('name', { ascending: true })
      .limit(500),
    supabase
      .from('tournament_players')
      .select(
        `id, registered_at, tournament_id, player_id, seat_number, status, current_bounty,
         guaranteed_bounty, rebuy_count, eliminated_at, final_position,
         player:players(id, created_at, name, nickname, avatar_url)`,
      )
      .eq('tournament_id', id)
      .order('registered_at', { ascending: true })
      .limit(100),
  ])

  if (tErr || !tournament) notFound()

  const registeredPlayers = (rawRegistered ?? []) as TournamentPlayerWithProfile[]

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-2">
        <a href="/admin/tournaments" className="text-sm text-muted-foreground hover:underline">
          Турниры
        </a>
        <span className="text-muted-foreground mx-1">/</span>
        <span className="text-sm">{tournament.name}</span>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Регистрация игроков</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Баунти за игрока: ₽{tournament.bounty_amount}
        </p>
      </div>
      <PlayerRegistration
        tournament={tournament}
        registeredPlayers={registeredPlayers}
        allPlayers={allPlayers ?? []}
      />
    </main>
  )
}
