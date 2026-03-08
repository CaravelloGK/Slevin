import { createServerClient } from '@/lib/supabase/server'
import { PlayerList } from '@/components/admin/player-list'

export default async function PlayersPage() {
  const supabase = await createServerClient()

  const { data: players } = await supabase
    .from('players')
    .select('id, created_at, name, nickname, avatar_url')
    .order('name', { ascending: true })
    .limit(500)

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Реестр игроков</h1>
        <p className="text-muted-foreground text-sm mt-1">Управление игроками системы.</p>
      </div>
      <PlayerList players={players ?? []} />
    </main>
  )
}
