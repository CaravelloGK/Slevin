import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import {
  Trophy,
  BarChart3,
  Clock,
  User,
  Users,
  Layers,
  Play,
  ClipboardList,
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  const { data: activeTournament } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('status', 'running')
    .limit(1)
    .maybeSingle()

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'Игрок'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <AppHeader role={role} />

      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#e6edf3]">Добро пожаловать</h1>
          <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
            {displayName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Active tournament — dealer panel */}
          {activeTournament && (role === 'dealer' || role === 'admin') && (
            <MenuCard
              href={`/tournament/${activeTournament.id}/dealer`}
              icon={Play}
              label="Панель дилера"
              description={activeTournament.name}
              highlight
              colSpan={2}
            />
          )}

          {/* Register / browse tournaments */}
          <MenuCard
            href="/tournaments"
            icon={Trophy}
            label="Турниры"
            description="Регистрация и просмотр"
          />

          {/* Club stats */}
          <MenuCard
            href="/club"
            icon={BarChart3}
            label="Статистика клуба"
            description="Рейтинг и итоги"
          />

          {/* Personal history */}
          <MenuCard
            href="/history"
            icon={Clock}
            label="Моя история"
            description="Личная статистика"
          />

          {/* Profile */}
          <MenuCard
            href="/profile"
            icon={User}
            label="Профиль"
            description="Настройки аккаунта"
          />

          {/* Admin-only section */}
          {role === 'admin' && (
            <>
              <div className="col-span-2 mt-2">
                <p
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: '#484f58' }}
                >
                  Управление
                </p>
              </div>

              <MenuCard
                href="/admin/tournaments"
                icon={ClipboardList}
                label="Турниры"
                description="Создать и управлять"
              />

              <MenuCard
                href="/admin/players"
                icon={Users}
                label="Игроки"
                description="База игроков"
              />

              <MenuCard
                href="/admin/structures"
                icon={Layers}
                label="Структуры блайндов"
                description="Уровни и таймеры"
                colSpan={2}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

interface MenuCardProps {
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  label: string
  description: string
  highlight?: boolean
  colSpan?: 1 | 2
}

function MenuCard({ href, icon: Icon, label, description, highlight, colSpan }: MenuCardProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-3 p-5 rounded-lg border transition-all hover:border-[#388bfd] hover:bg-[#161b22] active:scale-[0.98] ${
        colSpan === 2 ? 'col-span-2' : ''
      }`}
      style={{
        background: highlight ? '#0f2822' : '#161b22',
        borderColor: highlight ? '#1a4731' : '#30363d',
      }}
    >
      <Icon size={20} strokeWidth={1.5} color={highlight ? '#d4af37' : '#8b949e'} />
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: highlight ? '#d4af37' : '#e6edf3' }}
        >
          {label}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>
          {description}
        </p>
      </div>
    </Link>
  )
}
