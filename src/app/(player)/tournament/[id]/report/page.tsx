import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { TournamentPlayerWithProfile, PrizePlace } from '@/types/tournament'

interface Props {
  params: Promise<{ id: string }>
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

function formatDuration(ms: number): string {
  if (ms <= 0) return '0 мин'
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h} ч ${m} мин`
  return `${m} мин`
}

function parsePrizeDistribution(raw: unknown): PrizePlace[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is PrizePlace => typeof p === 'object' && p !== null && 'position' in p && 'percentage' in p)
    .sort((a, b) => a.position - b.position)
}

const ORDINALS: Record<number, string> = {
  1: '1-е', 2: '2-е', 3: '3-е', 4: '4-е', 5: '5-е', 6: '6-е', 7: '7-е', 8: '8-е',
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select(
      'id, name, status, bounty_amount, entry_fee, prize_distribution, current_level, started_at, finished_at, created_at, blind_structure_id',
    )
    .eq('id', id)
    .single()

  if (error || !tournament) notFound()

  // Fetch players with eliminated_at for stable position sorting
  const { data: rawPlayers } = await supabase
    .from('tournament_players')
    .select(
      `id, player_id, seat_number, status, current_bounty, guaranteed_bounty,
       rebuy_count, final_position, eliminated_at,
       player:players(id, name, nickname)`,
    )
    .eq('tournament_id', id)
    .limit(200)

  const players = (rawPlayers ?? []) as (TournamentPlayerWithProfile & { eliminated_at: string | null })[]

  // Fetch pause/resume events for net playing time
  const { data: timerEvents } = await supabase
    .from('tournament_logs')
    .select('event_type, created_at')
    .eq('tournament_id', id)
    .in('event_type', ['timer.paused', 'timer.resumed'])
    .order('created_at', { ascending: true })
    .limit(500)

  // Calculate total pause duration
  let totalPauseMs = 0
  let pauseStart: Date | null = null
  for (const ev of timerEvents ?? []) {
    if (ev.event_type === 'timer.paused') {
      pauseStart = new Date(ev.created_at)
    } else if (ev.event_type === 'timer.resumed' && pauseStart) {
      totalPauseMs += new Date(ev.created_at).getTime() - pauseStart.getTime()
      pauseStart = null
    }
  }
  if (pauseStart && tournament.finished_at) {
    totalPauseMs += new Date(tournament.finished_at).getTime() - pauseStart.getTime()
  }

  const startedAt = tournament.started_at
  const finishedAt = tournament.finished_at
  const totalMs =
    startedAt && finishedAt
      ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      : 0
  const netMs = Math.max(0, totalMs - totalPauseMs)

  const totalReentries = players.reduce((s, p) => s + p.rebuy_count, 0)
  const prizePool = tournament.entry_fee * (players.length + totalReentries)

  const prizeDistribution = parsePrizeDistribution(tournament.prize_distribution)

  // Sort players: winner first, then by final_position ASC, then eliminated_at ASC as tiebreaker,
  // active (no position) at the end
  const sorted = [...players].sort((a, b) => {
    if (a.status === 'winner') return -1
    if (b.status === 'winner') return 1
    const aPos = a.final_position ?? 9999
    const bPos = b.final_position ?? 9999
    if (aPos !== bPos) return aPos - bPos
    // Same position: earlier elimination = lower (worse) place — sort by eliminated_at ASC
    const aT = a.eliminated_at ? new Date(a.eliminated_at).getTime() : 0
    const bT = b.eliminated_at ? new Date(b.eliminated_at).getTime() : 0
    return aT - bT
  })

  const isFinished = tournament.status === 'finished'

  return (
    <main
      className="min-h-screen p-6 max-w-3xl mx-auto"
      style={{ fontFamily: 'var(--font-barlow), system-ui, sans-serif' }}
    >
      {/* Title */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-[#484f58] uppercase mb-1">
          Статистика турнира
        </p>
        <h1 className="text-2xl font-bold text-[#e6edf3]">{tournament.name}</h1>
        {!isFinished && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-[#1a4731] text-[#2ea043] tracking-widest uppercase font-semibold">
            {tournament.status === 'running' ? 'Идёт' : tournament.status === 'paused' ? 'Пауза' : 'Ожидает'}
          </span>
        )}
        {isFinished && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] tracking-widest uppercase font-semibold">
            Завершён
          </span>
        )}
      </div>

      {/* Timing stats */}
      {startedAt && (
        <section className="mb-8">
          <SectionTitle>Время проведения (МСК)</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Начало" value={toMoscow(startedAt)} />
            <StatCard label="Окончание" value={toMoscow(finishedAt)} />
            <StatCard label="Общее время" value={totalMs > 0 ? formatDuration(totalMs) : '—'} />
            <StatCard label="Чистое игровое" value={totalMs > 0 ? formatDuration(netMs) : '—'} hint="без пауз" />
          </div>
        </section>
      )}

      {/* Blind levels and players */}
      <section className="mb-8">
        <SectionTitle>Блайнды и игроки</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Уровней блайнда" value={String(tournament.current_level)} />
          <StatCard label="Игроков" value={String(players.length)} />
          <StatCard label="Реентри" value={String(totalReentries)} />
          <StatCard label="Призовой фонд" value={`₽${prizePool.toLocaleString()}`} />
        </div>
      </section>

      {/* Prize distribution */}
      {prizeDistribution.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Распределение призов</SectionTitle>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0d1117', borderBottom: '1px solid #30363d' }}>
                  <th className="px-4 py-2.5 text-left text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Место</th>
                  <th className="px-4 py-2.5 text-left text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Игрок</th>
                  <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Доля</th>
                  <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Приз</th>
                </tr>
              </thead>
              <tbody>
                {prizeDistribution.map((place) => {
                  const prizeAmount = Math.round(prizePool * place.percentage / 100)
                  // Find player who got this position
                  const placedPlayer = sorted.find((p) =>
                    place.position === 1
                      ? p.status === 'winner'
                      : p.final_position === place.position,
                  )
                  const name = placedPlayer
                    ? (placedPlayer.player.nickname ?? placedPlayer.player.name).toUpperCase()
                    : isFinished ? '—' : 'в игре'
                  const isTopPlace = place.position === 1

                  return (
                    <tr
                      key={place.position}
                      style={{
                        borderBottom: '1px solid #21262d',
                        background: isTopPlace ? '#1a1a0a' : 'transparent',
                      }}
                    >
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: isTopPlace ? '#d4af37' : '#8b949e',
                            fontFamily: 'var(--font-space-mono)',
                          }}
                        >
                          {ORDINALS[place.position] ?? `${place.position}-е`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: isTopPlace ? '#d4af37' : '#e6edf3' }}>
                        {name}
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm"
                        style={{ color: '#8b949e', fontFamily: 'var(--font-space-mono)' }}
                      >
                        {place.percentage}%
                      </td>
                      <td
                        className="px-4 py-3 text-right text-sm font-bold"
                        style={{ color: isTopPlace ? '#d4af37' : '#e6edf3', fontFamily: 'var(--font-space-mono)' }}
                      >
                        {prizeAmount > 0 ? `₽${prizeAmount.toLocaleString()}` : '₽0'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Full player results */}
      <section>
        <SectionTitle>Итоги игроков</SectionTitle>
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#30363d' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#0d1117', borderBottom: '1px solid #30363d' }}>
                <th className="px-4 py-2.5 text-left text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Место</th>
                <th className="px-4 py-2.5 text-left text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Игрок</th>
                <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Реентри</th>
                <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Баунти выиграно</th>
                {tournament.entry_fee > 0 && (
                  <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.2em] text-[#484f58] uppercase font-semibold">Потрачено</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const name = p.player.nickname ?? p.player.name
                const isWinner = p.status === 'winner'
                const isActive = p.status === 'active'
                const spent = tournament.entry_fee * (p.rebuy_count + 1)
                const pos = isWinner ? 1 : p.final_position
                const bountyEarned = isWinner
                  ? p.current_bounty + p.guaranteed_bounty
                  : p.guaranteed_bounty
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #21262d',
                      background: isWinner ? '#1a1a0a' : 'transparent',
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: isWinner ? '#d4af37' : isActive ? '#2ea043' : '#8b949e',
                          fontFamily: 'var(--font-space-mono)',
                        }}
                      >
                        {isActive && !isFinished ? 'в игре' : pos ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span
                          className="font-semibold"
                          style={{ color: isWinner ? '#d4af37' : '#e6edf3' }}
                        >
                          {name.toUpperCase()}
                          {isWinner && (
                            <span className="ml-2 text-[10px] font-bold tracking-widest bg-[#3d2e00] text-[#d4af37] px-1.5 py-0.5 rounded">
                              ПОБЕДИТЕЛЬ
                            </span>
                          )}
                        </span>
                        {p.player.nickname && (
                          <span className="text-xs text-[#484f58]">{p.player.name}</span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-right text-sm"
                      style={{ color: p.rebuy_count > 0 ? '#d29922' : '#484f58', fontFamily: 'var(--font-space-mono)' }}
                    >
                      {p.rebuy_count > 0 ? `×${p.rebuy_count}` : '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-right text-sm font-semibold"
                      style={{ color: bountyEarned > 0 ? '#d4af37' : '#484f58', fontFamily: 'var(--font-space-mono)' }}
                    >
                      {bountyEarned > 0 ? `₽${bountyEarned.toLocaleString()}` : '—'}
                    </td>
                    {tournament.entry_fee > 0 && (
                      <td
                        className="px-4 py-3 text-right text-sm"
                        style={{ color: '#8b949e', fontFamily: 'var(--font-space-mono)' }}
                      >
                        ₽{spent.toLocaleString()}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] tracking-[0.3em] text-[#484f58] uppercase mb-3 font-semibold">
      {children}
    </h2>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 flex flex-col gap-0.5"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      <span
        className="text-[9px] tracking-[0.2em] text-[#484f58] uppercase font-semibold"
        style={{ fontFamily: 'var(--font-barlow)' }}
      >
        {label}
      </span>
      <span
        className="text-base font-bold text-[#e6edf3]"
        style={{ fontFamily: 'var(--font-space-mono)' }}
      >
        {value}
      </span>
      {hint && (
        <span className="text-[9px] text-[#484f58]" style={{ fontFamily: 'var(--font-barlow)' }}>
          {hint}
        </span>
      )}
    </div>
  )
}
