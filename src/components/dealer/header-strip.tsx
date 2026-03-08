'use client'

import { BlindTimerDisplay } from './blind-timer-display'
import { ConnectionBadge } from './connection-badge'
import type { BlindLevel, Tournament } from '@/types/tournament'

interface HeaderStripProps {
  tournament: Tournament
  currentLevel: BlindLevel | undefined
  nextLevel: BlindLevel | undefined
  connected: boolean
  pendingCount: number
  isOnline: boolean
}

export function HeaderStrip({
  tournament,
  currentLevel,
  nextLevel,
  connected,
  pendingCount,
  isOnline,
}: HeaderStripProps) {
  return (
    <header
      className="flex items-center justify-between px-5 shrink-0"
      style={{
        height: 72,
        background: '#0d1117',
        borderBottom: '1px solid #30363d',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
          style={{ background: '#1a4731', color: '#d4af37', fontFamily: 'var(--font-bebas)' }}
        >
          S
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-lg font-bold text-[#e6edf3] tracking-[0.1em]"
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
      </div>

      {/* Timer center */}
      <BlindTimerDisplay
        tournament={tournament}
        currentLevel={currentLevel}
        nextLevel={nextLevel}
      />

      {/* Status right */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-end leading-none">
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
        <ConnectionBadge
          connected={connected}
          pendingCount={pendingCount}
          isOnline={isOnline}
        />
      </div>
    </header>
  )
}
