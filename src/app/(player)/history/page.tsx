import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { TournamentPosterCard } from '@/components/tournament/tournament-poster-card'

export default async function HistoryPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  // Find player linked to this auth user
  const { data: playerRow } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  type TournamentEntry = {
    tournament_id: string
    tournaments: {
      id: string
      name: string
      poster_url: string | null
      started_at: string | null
      finished_at: string | null
      status: string
    } | null
  }

  let entries: TournamentEntry[] = []

  if (playerRow) {
    const { data } = await supabase
      .from('tournament_players')
      .select(
        `tournament_id,
         tournaments(id, name, poster_url, started_at, finished_at, status)`,
      )
      .eq('player_id', playerRow.id)
      .order('registered_at', { ascending: false })
      .limit(100)

    entries = (data ?? []) as TournamentEntry[]
  }

  // Deduplicate (player can have multiple entries per tournament via rebuy)
  const seen = new Set<string>()
  const tournaments = entries
    .filter((e) => {
      if (!e.tournaments || seen.has(e.tournament_id)) return false
      seen.add(e.tournament_id)
      return true
    })
    .map((e) => e.tournaments!)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <AppHeader role={role} />
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-[#484f58] uppercase mb-1">Ваши турниры</p>
        <h1 className="text-2xl font-bold text-[#e6edf3] mb-8">Моя история</h1>

        {!playerRow ? (
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <p className="text-sm text-[#8b949e]">
              Ваш аккаунт не привязан к профилю игрока. Обратитесь к администратору клуба.
            </p>
          </div>
        ) : !tournaments.length ? (
          <p className="text-sm text-[#484f58]">Вы ещё не участвовали ни в одном турнире.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {tournaments.map((t) => (
              <TournamentPosterCard
                key={t.id}
                id={t.id}
                name={t.name}
                posterUrl={t.poster_url}
                date={t.finished_at ?? t.started_at}
                href={`/history/${t.id}`}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
