import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import type { PrizePlace } from '@/types/tournament'

interface Props {
  params: Promise<{ id: string }>
}

function parsePrizeDistribution(raw: unknown): PrizePlace[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (p): p is PrizePlace =>
        typeof p === 'object' && p !== null && 'position' in p && 'percentage' in p,
    )
    .sort((a, b) => a.position - b.position)
}

function toMoscow(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function HistoryTournamentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined

  // Get current user's player row
  const { data: playerRow } = await supabase
    .from('players')
    .select('id, name, nickname')
    .eq('user_id', user.id)
    .single()

  if (!playerRow) redirect('/history')

  // Get tournament
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select(
      'id, name, status, bounty_amount, entry_fee, prize_distribution, started_at, finished_at, dealer_player_id',
    )
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  // Get current player's entry in this tournament
  const { data: myEntry } = await supabase
    .from('tournament_players')
    .select(
      'id, status, current_bounty, guaranteed_bounty, rebuy_count, final_position, eliminated_at',
    )
    .eq('tournament_id', id)
    .eq('player_id', playerRow.id)
    .single()

  if (!myEntry) {
    // Player did not participate in this tournament
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
        <AppHeader role={role} />
        <main className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-xs text-[#484f58] hover:text-[#8b949e] transition-colors mb-6 uppercase tracking-widest"
          >
            &larr; Моя история
          </Link>
          <h1 className="text-2xl font-bold text-[#e6edf3] mb-4">{tournament.name}</h1>
          <p className="text-sm text-[#484f58]">Вы не участвовали в этом турнире.</p>
        </main>
      </div>
    )
  }

  const prizeDistribution = parsePrizeDistribution(tournament.prize_distribution)
  const { data: allEntries } = await supabase
    .from('tournament_players')
    .select('id, player_id, rebuy_count')
    .eq('tournament_id', id)
    .limit(200)

  const dealerPlayerId = tournament.dealer_player_id ?? null
  const competingEntries = (allEntries ?? []).filter((e) => e.player_id !== dealerPlayerId)
  const playerCount = competingEntries.length
  const totalReentries = competingEntries.reduce((s, p) => s + p.rebuy_count, 0)
  const prizePool = tournament.entry_fee * (playerCount + totalReentries)

  const spent = (tournament.entry_fee + tournament.bounty_amount) * (myEntry.rebuy_count + 1)
  const isWinner = myEntry.status === 'winner'
  const myPosition = isWinner ? 1 : myEntry.final_position
  const bountyEarned = isWinner
    ? myEntry.current_bounty + myEntry.guaranteed_bounty
    : myEntry.guaranteed_bounty

  // Calculate prize won
  let prizeWon = 0
  if (myPosition !== null) {
    const place = prizeDistribution.find((p) =>
      myPosition === 1 ? isWinner : p.position === myPosition,
    )
    if (place) prizeWon = Math.round((prizePool * place.percentage) / 100)
  }

  const displayName = playerRow.nickname ?? playerRow.name

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <AppHeader role={role} />
      <main
        className="flex-1 p-6 max-w-lg mx-auto w-full"
        style={{ fontFamily: 'var(--font-barlow), system-ui, sans-serif' }}
      >
        {/* Back */}
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-xs text-[#484f58] hover:text-[#8b949e] transition-colors mb-6 uppercase tracking-widest"
        >
          &larr; Моя история
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs tracking-[0.3em] text-[#484f58] uppercase mb-1">Мои результаты</p>
          <h1 className="text-2xl font-bold text-[#e6edf3]">{tournament.name}</h1>
          <p className="text-sm text-[#484f58] mt-1">{toMoscow(tournament.started_at)}</p>
        </div>

        {/* Player badge */}
        <div
          className="rounded-lg px-5 py-4 mb-6 flex items-center gap-4"
          style={{
            background: isWinner ? '#1a1a0a' : '#161b22',
            border: `1px solid ${isWinner ? '#d4af37' : '#30363d'}`,
          }}
        >
          <div className="flex flex-col">
            <span
              className="text-sm font-bold uppercase"
              style={{ color: isWinner ? '#d4af37' : '#e6edf3' }}
            >
              {displayName}
            </span>
            {playerRow.nickname && (
              <span className="text-xs text-[#484f58]">{playerRow.name}</span>
            )}
          </div>
          {isWinner && (
            <span className="ml-auto text-[10px] font-bold tracking-widest bg-[#3d2e00] text-[#d4af37] px-2 py-0.5 rounded uppercase">
              Победитель
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="Место"
            value={
              myEntry.status === 'active'
                ? 'в игре'
                : myPosition !== null
                  ? `${myPosition}-е`
                  : '—'
            }
            highlight={isWinner}
          />
          <StatCard label="Реентри" value={myEntry.rebuy_count > 0 ? `×${myEntry.rebuy_count}` : '0'} />
          {tournament.entry_fee > 0 && (
            <StatCard label="Потрачено" value={<>{spent.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span></>} />
          )}
          <StatCard
            label="Баунти собрано"
            value={bountyEarned > 0 ? <>{bountyEarned.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span></> : '—'}
            highlight={bountyEarned > 0}
          />
          {prizeWon > 0 && (
            <StatCard
              label="Выигрыш"
              value={<>{prizeWon.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span></>}
              highlight
            />
          )}
          {myEntry.eliminated_at && (
            <StatCard label="Выбыл" value={toMoscow(myEntry.eliminated_at)} />
          )}
        </div>

        {/* Link to full club stats */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid #21262d' }}>
          <Link
            href={`/club/${id}`}
            className="text-xs text-[#484f58] hover:text-[#8b949e] transition-colors uppercase tracking-widest"
          >
            Общая статистика турнира &rarr;
          </Link>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-lg px-4 py-3 flex flex-col gap-0.5"
      style={{
        background: highlight ? '#1a1a0a' : '#161b22',
        border: `1px solid ${highlight ? '#3d2e00' : '#30363d'}`,
      }}
    >
      <span
        className="text-[9px] tracking-[0.2em] uppercase font-semibold"
        style={{ color: '#484f58', fontFamily: 'var(--font-barlow)' }}
      >
        {label}
      </span>
      <span
        className="text-base font-bold"
        style={{
          color: highlight ? '#d4af37' : '#e6edf3',
          fontFamily: 'var(--font-space-mono)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
