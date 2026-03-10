import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import Link from 'next/link'

export default async function TournamentsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, entry_fee, created_at')
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <AppHeader role={role} />
      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-[#e6edf3] mb-6">Турниры</h1>

        {!tournaments || tournaments.length === 0 ? (
          <p className="text-sm" style={{ color: '#8b949e' }}>
            Нет активных турниров.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournament/${t.id}`}
                className="flex items-center justify-between p-4 rounded-lg border transition-all hover:border-[#388bfd] hover:bg-[#161b22]"
                style={{ background: '#161b22', borderColor: '#30363d' }}
              >
                <div>
                  <p className="text-sm font-semibold text-[#e6edf3]">{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>
                    {t.entry_fee > 0 ? `Взнос: ₽${t.entry_fee.toLocaleString()}` : 'Без взноса'}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Регистрация', color: '#388bfd' },
    running: { label: 'Идёт', color: '#2ea043' },
  }
  const c = config[status] ?? { label: status, color: '#8b949e' }
  return (
    <span className="text-xs font-medium px-2 py-1 rounded" style={{ color: c.color, background: `${c.color}1a` }}>
      {c.label}
    </span>
  )
}
