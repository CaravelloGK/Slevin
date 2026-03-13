'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useBlindTimer } from '@/hooks/use-blind-timer'
import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'
import { BlindTimerDisplay } from '@/components/dealer/blind-timer-display'
import { SpectatorPlayerCard } from './spectator-player-card'
import type { BlindLevel, Tournament, TournamentPlayerWithProfile } from '@/types/tournament'

interface SpectatorPanelProps {
  initialTournament: Tournament
  initialPlayers: TournamentPlayerWithProfile[]
  blindLevels: BlindLevel[]
}

export function SpectatorPanel({
  initialTournament,
  initialPlayers,
  blindLevels,
}: SpectatorPanelProps) {
  const [tournament, setTournament] = useState<Tournament>(initialTournament)
  const [players, setPlayers] = useState<TournamentPlayerWithProfile[]>(initialPlayers)
  const [connected, setConnected] = useState(false)

  const currentLevel = blindLevels.find((l) => l.level_number === tournament.current_level)
  const nextLevel = blindLevels.find((l) => l.level_number === tournament.current_level + 1)

  useBlindTimer(tournament, currentLevel)

  useTournamentRealtime({
    tournamentId: tournament.id,
    onPlayersChange: setPlayers,
    onTournamentChange: setTournament,
    onConnectionChange: setConnected,
  })

  const dealerPlayerId = tournament.dealer_player_id ?? null
  const competingPlayers = players.filter((p) => p.player_id !== dealerPlayerId)
  const activePlayers = competingPlayers.filter((p) => p.status === 'active').length
  const totalReentries = competingPlayers.reduce((s, p) => s + p.rebuy_count, 0)
  const entries = competingPlayers.length + totalReentries
  const prizePool = tournament.entry_fee * entries
  const bountyBank = tournament.bounty_amount * entries

  const sortedPlayers = [...players].sort((a, b) => {
    const aOut = a.status === 'eliminated' ? 1 : 0
    const bOut = b.status === 'eliminated' ? 1 : 0
    if (aOut !== bOut) return aOut - bOut
    return (a.seat_number ?? 99) - (b.seat_number ?? 99)
  })

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        width: '100vw',
        background: '#0d1117',
        fontFamily: 'var(--font-barlow), system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 72, background: '#0d1117', borderBottom: '1px solid #30363d' }}
      >
        {/* Logo + tournament name */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-3 group" aria-label="Главное меню">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold group-hover:opacity-75 transition-opacity"
              style={{ background: '#1a4731', color: '#d4af37', fontFamily: 'var(--font-bebas)' }}
            >
              S
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-lg font-bold text-[#e6edf3] tracking-[0.1em] group-hover:text-[#d4af37] transition-colors"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                SLEVIN
              </span>
              <span
                className="text-[9px] tracking-[0.3em] text-[#1a4731] uppercase"
                style={{ fontFamily: 'var(--font-barlow)' }}
              >
                Наблюдатель
              </span>
            </div>
          </Link>
          <div
            className="flex items-center gap-1.5"
            style={{ borderLeft: '1px solid #21262d', paddingLeft: '1rem' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: connected ? '#2ea043' : '#484f58',
                boxShadow: connected ? '0 0 6px #2ea043' : 'none',
              }}
            />
            <span
              className="text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: connected ? '#2ea043' : '#484f58', fontFamily: 'var(--font-barlow)' }}
            >
              {connected ? 'Live' : 'Офлайн'}
            </span>
          </div>
          <div
            className="flex flex-col leading-none"
            style={{ borderLeft: '1px solid #21262d', paddingLeft: '1rem' }}
          >
            <span
              className="text-[9px] tracking-[0.2em] text-[#484f58] uppercase"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Турнир
            </span>
            <span
              className="text-sm font-semibold text-[#8b949e] max-w-[140px] truncate"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              {tournament.name}
            </span>
          </div>
        </div>

        {/* Timer center */}
        <BlindTimerDisplay
          tournament={tournament}
          currentLevel={currentLevel}
          nextLevel={nextLevel}
        />

        {/* Right: prize pool + players + live badge */}
        <div className="flex items-center gap-4 shrink-0">
          {tournament.entry_fee > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end leading-none">
                <span
                  className="text-[9px] tracking-[0.2em] text-[#484f58] uppercase"
                  style={{ fontFamily: 'var(--font-barlow)' }}
                >
                  Призовой фонд
                </span>
                <span
                  className="text-sm font-bold text-[#d4af37]"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                >
                  {prizePool.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span>
                </span>
              </div>
              {Array.isArray(tournament.prize_distribution) && (tournament.prize_distribution as Array<{ position: number; percentage: number }>).length > 0 && (
                <div
                  className="flex flex-col justify-center gap-[2px]"
                  style={{ borderLeft: '1px solid #21262d', paddingLeft: '1rem' }}
                >
                  {(tournament.prize_distribution as Array<{ position: number; percentage: number }>).map((place) => {
                    const amount = Math.round(prizePool * place.percentage / 100)
                    return (
                      <div key={place.position} className="flex items-baseline gap-[3px] leading-none">
                        <span
                          className="text-[8px] text-[#484f58]"
                          style={{ fontFamily: 'var(--font-barlow)' }}
                        >
                          {place.position} -
                        </span>
                        <span
                          className="text-[10px] font-bold text-[#d4af37]"
                          style={{ fontFamily: 'var(--font-space-mono)' }}
                        >
                          {amount.toLocaleString()}<span style={{ fontSize: '0.7em' }}>₽</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {bountyBank > 0 && (
            <div className="flex flex-col items-end leading-none">
              <span
                className="text-[9px] tracking-[0.2em] uppercase"
                style={{ fontFamily: 'var(--font-barlow)', color: '#7f1d1d' }}
              >
                Банк баунти
              </span>
              <span
                className="text-sm font-bold"
                style={{ fontFamily: 'var(--font-space-mono)', color: '#ef4444' }}
              >
                {bountyBank.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span>
              </span>
            </div>
          )}
          <div className="flex flex-col items-end leading-none">
            <span
              className="text-[9px] tracking-[0.2em] text-[#484f58] uppercase"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Игроков
            </span>
            <span
              className="text-sm font-bold text-[#e6edf3]"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {activePlayers}/{players.length}
            </span>
          </div>
        </div>
      </header>

      {/* Finished banner */}
      {tournament.status === 'finished' && (
        <div
          className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ background: '#1a1a0a', borderBottom: '1px solid #3d2e00' }}
        >
          <span
            className="text-sm font-bold tracking-[0.1em] text-[#d4af37] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Турнир завершён
          </span>
          <a
            href={`/club/${tournament.id}`}
            className="px-4 py-1.5 rounded text-xs font-bold tracking-widest uppercase"
            style={{
              background: '#3d2e00',
              color: '#d4af37',
              border: '1px solid #d4af37',
              fontFamily: 'var(--font-barlow)',
            }}
          >
            Статистика →
          </a>
        </div>
      )}

      {/* Paused banner */}
      {tournament.status === 'paused' && (
        <div
          className="px-5 py-2 flex items-center justify-center shrink-0"
          style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}
        >
          <span
            className="text-xs font-bold tracking-[0.2em] text-[#8b949e] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Пауза
          </span>
        </div>
      )}

      {/* Player grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
            alignContent: 'start',
          }}
        >
          {sortedPlayers.map((entry) => (
            <SpectatorPlayerCard
              key={entry.id}
              entry={entry}
              entryFee={tournament.entry_fee}
              bountyAmount={tournament.bounty_amount}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
