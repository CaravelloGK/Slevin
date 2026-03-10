import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { ProfileForm } from './profile-form'
import { AvatarUpload } from './avatar-upload'

export default async function ProfilePage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  const { data: player } = await supabase
    .from('players')
    .select('id, name, nickname, avatar_url')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <AppHeader role={role} />
      <main className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
        <p className="text-xs tracking-[0.3em] text-[#484f58] uppercase mb-1">Аккаунт</p>
        <h1 className="text-2xl font-bold text-[#e6edf3] mb-8">Профиль</h1>

        {!player ? (
          <div
            className="rounded-lg p-6"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <p className="text-sm font-semibold text-[#e6edf3] mb-2">Профиль не привязан</p>
            <p className="text-sm text-[#8b949e]">
              Ваш аккаунт пока не связан с профилем игрока. Обратитесь к администратору клуба.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={player.avatar_url}
              playerName={player.nickname ?? player.name}
            />
            <ProfileForm initialName={player.name} initialNickname={player.nickname} />
          </div>
        )}
      </main>
    </div>
  )
}
