import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'

export default async function ClubPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <AppHeader role={role} />
      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-[#e6edf3] mb-2">Статистика клуба</h1>
        <p className="text-sm" style={{ color: '#8b949e' }}>
          Общий рейтинг и итоги сезона — в разработке.
        </p>
      </main>
    </div>
  )
}
