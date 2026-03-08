import { createServerClient } from '@/lib/supabase/server'
import { TournamentList } from '@/components/admin/tournament-list'

export default async function TournamentsPage() {
  const supabase = await createServerClient()

  const [{ data: tournaments }, { data: structures }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, created_at, name, status, bounty_amount, entry_fee, prize_distribution, current_level, level_started_at, started_at, finished_at, blind_structure_id')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('blind_structures')
      .select('id, created_at, name')
      .order('name', { ascending: true })
      .limit(100),
  ])

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Турниры</h1>
        <p className="text-muted-foreground text-sm mt-1">Создание и управление турнирами.</p>
      </div>
      <TournamentList tournaments={tournaments ?? []} structures={structures ?? []} />
    </main>
  )
}
