import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/app-header'
import { RegisterButton } from './register-button'
import { TournamentLobbyRealtime } from './realtime'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TournamentLobbyPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('id, name, status, entry_fee, bounty_amount')
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  // Running/paused → redirect to live view
  if (tournament.status === 'running' || tournament.status === 'paused') {
    redirect(`/tournament/${id}/live`)
  }

  // Finished → redirect to club stats
  if (tournament.status === 'finished') {
    redirect(`/club/${id}`)
  }

  // Fetch registered players
  const { data: registered } = await supabase
    .from('tournament_players')
    .select('id, player:players(id, name, nickname)')
    .eq('tournament_id', id)
    .limit(100)

  // Check if current user is already registered
  const { data: playerRow } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const isRegistered = playerRow
    ? (registered ?? []).some(
        (r) => (r.player as { id: string } | null)?.id === playerRow.id,
      )
    : false

  const hasPlayerProfile = !!playerRow

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <TournamentLobbyRealtime tournamentId={id} />
      <AppHeader role={role} />
      <main className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <span
            className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded mb-3 inline-block"
            style={{ background: '#1a2f5a', color: '#388bfd' }}
          >
            Регистрация открыта
          </span>
          <h1 className="text-2xl font-bold text-[#e6edf3]">{tournament.name}</h1>
        </div>

        {/* Tournament info */}
        <div
          className="rounded-lg p-5 mb-6 grid grid-cols-2 gap-4"
          style={{ background: '#161b22', border: '1px solid #30363d' }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">
              Взнос
            </span>
            <span
              className="text-lg font-bold text-[#e6edf3]"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {tournament.entry_fee > 0 ? <>{tournament.entry_fee.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span></> : 'Бесплатно'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">
              Стартовый баунти
            </span>
            <span
              className="text-lg font-bold text-[#e6edf3]"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {tournament.bounty_amount > 0
                ? <>{tournament.bounty_amount.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span></>
                : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 col-span-2">
            <span className="text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">
              Зарегистрировано игроков
            </span>
            <span
              className="text-lg font-bold text-[#e6edf3]"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {registered?.length ?? 0}
            </span>
          </div>
        </div>

        {/* Register button or status */}
        {!hasPlayerProfile ? (
          <div
            className="rounded-lg px-5 py-3 text-sm text-[#8b949e]"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            Профиль игрока не привязан к аккаунту. Обратитесь к администратору.
          </div>
        ) : (
          <RegisterButton tournamentId={id} isRegistered={isRegistered} />
        )}

        {/* Player list */}
        {(registered?.length ?? 0) > 0 && (
          <div className="mt-8">
            <p className="text-[10px] tracking-[0.3em] text-[#484f58] uppercase font-semibold mb-3">
              Участники
            </p>
            <div className="flex flex-col gap-1">
              {registered!.map((r) => {
                const p = r.player as { id: string; name: string; nickname: string | null } | null
                if (!p) return null
                return (
                  <div
                    key={r.id}
                    className="flex items-center px-4 py-2.5 rounded-lg text-sm"
                    style={{ background: '#161b22', border: '1px solid #21262d' }}
                  >
                    <span className="font-semibold text-[#e6edf3]">
                      {p.nickname ?? p.name}
                    </span>
                    {p.nickname && (
                      <span className="ml-2 text-xs text-[#484f58]">{p.name}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
