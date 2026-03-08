'use client'

import type { TournamentPlayerWithProfile } from '@/types/tournament'

interface PlayerCardProps {
  entry: TournamentPlayerWithProfile
  onKnockout: (victim: TournamentPlayerWithProfile) => void
  onRebuy: (player: TournamentPlayerWithProfile) => void
  isSelectingKiller?: boolean
  onSelectAsKiller?: (player: TournamentPlayerWithProfile) => void
}

export function PlayerCard({
  entry,
  onKnockout,
  onRebuy,
  isSelectingKiller,
  onSelectAsKiller,
}: PlayerCardProps) {
  const isEliminated = entry.status === 'eliminated'
  const isActive = entry.status === 'active'

  const displayName = entry.player.nickname ?? entry.player.name

  // Killer-select mode renders a large pressable target
  if (isSelectingKiller) {
    return (
      <button
        onClick={() => onSelectAsKiller?.(entry)}
        disabled={isEliminated}
        className="w-full h-full rounded-lg border-2 transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: isEliminated ? '#0f1923' : '#1c2129',
          borderColor: isEliminated ? '#21262d' : '#2ea043',
          cursor: isEliminated ? 'not-allowed' : 'pointer',
        }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-1 p-3">
          <span
            className="text-[11px] tracking-widest text-[#8b949e] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Место {entry.seat_number ?? '?'}
          </span>
          <span
            className="text-xl font-bold text-[#e6edf3] text-center leading-tight"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            {displayName.toUpperCase()}
          </span>
          <div
            className="text-lg font-bold text-[#d4af37] mt-1"
            style={{ fontFamily: 'var(--font-space-mono)' }}
          >
            ◈ {entry.current_bounty.toLocaleString()}
          </div>
        </div>
      </button>
    )
  }

  // Normal card rendering
  return (
    <div
      className="relative flex flex-col rounded-lg border overflow-hidden transition-all duration-200"
      style={{
        background: isEliminated ? '#0f1117' : '#161b22',
        borderColor: isEliminated ? '#21262d' : isActive ? '#30363d' : '#30363d',
        opacity: isEliminated ? 0.65 : 1,
      }}
    >
      {/* Status bar (top accent line) */}
      <div
        className="h-0.5 w-full"
        style={{
          background: isEliminated
            ? '#3d1f1f'
            : entry.status === 'rebought'
              ? '#3d2a00'
              : '#1a4731',
        }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span
          className="text-[11px] font-semibold tracking-[0.15em] text-[#8b949e] uppercase"
          style={{ fontFamily: 'var(--font-barlow)' }}
        >
          Seat {entry.seat_number ?? '?'}
        </span>

        <div className="flex items-center gap-1.5">
          {isEliminated && (
            <span
              className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{
                background: '#3d1f1f',
                color: '#da3633',
                fontFamily: 'var(--font-barlow)',
              }}
            >
              ВЫБЫЛ
            </span>
          )}
          {entry.rebuy_count > 0 && (
            <span
              className="text-[10px] font-semibold tracking-wider text-[#8b949e]"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              R×{entry.rebuy_count}
            </span>
          )}
        </div>
      </div>

      {/* Player name */}
      <div className="px-3 pb-2">
        <span
          className="text-base font-bold leading-tight block"
          style={{
            fontFamily: 'var(--font-barlow)',
            color: isEliminated ? '#484f58' : '#e6edf3',
            textDecoration: isEliminated ? 'line-through' : 'none',
            textDecorationColor: '#484f58',
          }}
        >
          {displayName.toUpperCase()}
        </span>
        {entry.player.nickname && (
          <span
            className="text-[11px] text-[#484f58]"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            {entry.player.name}
          </span>
        )}
      </div>

      {/* Bounty row */}
      <div
        className="mx-3 mb-2 px-2 py-1.5 rounded flex items-center justify-between"
        style={{ background: '#0d1117' }}
      >
        <div className="flex flex-col">
          <span
            className="text-[9px] tracking-[0.15em] text-[#484f58] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Баунти
          </span>
          <span
            className="text-xl font-bold leading-none"
            style={{
              fontFamily: 'var(--font-space-mono)',
              color: isEliminated ? '#484f58' : '#d4af37',
            }}
          >
            ◈{entry.current_bounty.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="text-[9px] tracking-[0.15em] text-[#484f58] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Зафикс.
          </span>
          <span
            className="text-sm leading-none"
            style={{
              fontFamily: 'var(--font-space-mono)',
              color: entry.guaranteed_bounty > 0 ? '#9b7e1f' : '#30363d',
            }}
          >
            ★{entry.guaranteed_bounty.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-3 flex gap-2">
        {isActive && (
          <button
            onClick={() => onKnockout(entry)}
            className="flex-1 py-2 rounded text-center text-[12px] font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
            style={{
              background: '#1a0a0a',
              color: '#da3633',
              border: '1px solid #3d1f1f',
              fontFamily: 'var(--font-barlow)',
            }}
          >
            Выбить
          </button>
        )}
        {isEliminated && (
          <button
            onClick={() => onRebuy(entry)}
            className="flex-1 py-2 rounded text-center text-[12px] font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
            style={{
              background: '#1a1200',
              color: '#d29922',
              border: '1px solid #3d2a00',
              fontFamily: 'var(--font-barlow)',
            }}
          >
            Ребай
          </button>
        )}
        {entry.status === 'rebought' && (
          <>
            <button
              onClick={() => onKnockout(entry)}
              className="flex-1 py-2 rounded text-center text-[12px] font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
              style={{
                background: '#1a0a0a',
                color: '#da3633',
                border: '1px solid #3d1f1f',
                fontFamily: 'var(--font-barlow)',
              }}
            >
              Выбить
            </button>
          </>
        )}
      </div>
    </div>
  )
}
