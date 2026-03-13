'use client'

import Link from 'next/link'
import { BlindTimerDisplay } from './blind-timer-display'
import { ConnectionBadge } from './connection-badge'
import type { BlindLevel, Tournament, TournamentPlayerWithProfile } from '@/types/tournament'

interface HeaderStripProps {
  tournament: Tournament
  currentLevel: BlindLevel | undefined
  nextLevel: BlindLevel | undefined
  connected: boolean
  pendingCount: number
  isOnline: boolean
  players: TournamentPlayerWithProfile[]
}

export function HeaderStrip({
  tournament,
  currentLevel,
  nextLevel,
  connected,
  pendingCount,
  isOnline,
  players,
}: HeaderStripProps) {
  const dealerPlayerId = tournament.dealer_player_id ?? null
  const competingPlayers = players.filter((p) => p.player_id !== dealerPlayerId)
  const totalReentries = competingPlayers.reduce((sum, p) => sum + p.rebuy_count, 0)
  const entries = competingPlayers.length + totalReentries
  const prizePool = tournament.entry_fee * entries
  const bountyBank = tournament.bounty_amount * entries

  return (
    <header
      className="flex items-center justify-between px-5 shrink-0"
      style={{
        height: 72,
        background: '#0d1117',
        borderBottom: '1px solid #30363d',
      }}
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
              Турнир OS
            </span>
          </div>
        </Link>
        <div style={{ borderLeft: '1px solid #21262d', paddingLeft: '1rem' }}>
          <ConnectionBadge
            connected={connected}
            pendingCount={pendingCount}
            isOnline={isOnline}
          />
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

      {/* Status right */}
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
      </div>
    </header>
  )
}
