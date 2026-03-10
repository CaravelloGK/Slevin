import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { TournamentPosterCard } from '@/components/tournament/tournament-poster-card'

export default async function ClubPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, poster_url, started_at, finished_at')
    .eq('status', 'finished')
    .order('finished_at', { ascending: false })
    .limit(100)

  // Mark tournaments the current user participated in (if linked to a player)
  const { data: playerRow } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const participatedIds = new Set<string>()
  if (playerRow) {
    const { data: tp } = await supabase
      .from('tournament_players')
      .select('tournament_id')
      .eq('player_id', playerRow.id)
      .limit(200)
    for (const row of tp ?? []) {
      participatedIds.add(row.tournament_id)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <AppHeader role={role} />
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-[#484f58] uppercase mb-1">Клуб</p>
        <h1 className="text-2xl font-bold text-[#e6edf3] mb-8">Статистика клуба</h1>

        {!tournaments?.length ? (
          <p className="text-sm text-[#484f58]">Завершённых турниров пока нет.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {tournaments.map((t) => (
              <TournamentPosterCard
                key={t.id}
                id={t.id}
                name={t.name}
                posterUrl={t.poster_url}
                date={t.finished_at ?? t.started_at}
                href={`/club/${t.id}`}
                participated={participatedIds.has(t.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
