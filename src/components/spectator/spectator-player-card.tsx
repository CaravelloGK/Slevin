import Image from 'next/image'
import { Ticket, Crosshair } from 'lucide-react'
import type { TournamentPlayerWithProfile } from '@/types/tournament'

interface SpectatorPlayerCardProps {
  entry: TournamentPlayerWithProfile
  entryFee: number
  bountyAmount: number
}

export function SpectatorPlayerCard({ entry, entryFee, bountyAmount }: SpectatorPlayerCardProps) {
  const isEliminated = entry.status === 'eliminated'
  const isWinner = entry.status === 'winner'
  const displayName = entry.player.nickname ?? entry.player.name

  return (
    <div
      className="relative flex flex-col rounded-lg border overflow-hidden transition-all duration-200"
      style={{
        background: isEliminated ? '#0f1117' : '#161b22',
        borderColor: isEliminated ? '#21262d' : '#30363d',
        opacity: isEliminated ? 0.65 : 1,
      }}
    >
      {/* Status accent line */}
      <div
        className="h-0.5 w-full"
        style={{
          background: isEliminated ? '#3d1f1f' : isWinner ? '#d4af37' : '#1a4731',
        }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        {/* Left: avatar + seat */}
        <div className="flex items-center gap-2">
          {entry.player.avatar_url ? (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid #30363d',
                flexShrink: 0,
              }}
            >
              <Image
                src={entry.player.avatar_url}
                alt=""
                width={28}
                height={28}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#21262d',
                border: '1px solid #30363d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'var(--font-barlow)',
                fontSize: '11px',
                fontWeight: 700,
                color: '#8b949e',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="text-[11px] font-semibold tracking-[0.15em] text-[#8b949e] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Seat {entry.seat_number ?? '?'}
          </span>
        </div>

        {/* Right: badges + financials */}
        <div className="flex items-center gap-1.5">
          {isEliminated && (
            <span
              className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: '#3d1f1f', color: '#da3633', fontFamily: 'var(--font-barlow)' }}
            >
              ВЫБЫЛ
            </span>
          )}
          {(entryFee > 0 || bountyAmount > 0) && (
            <div className="flex flex-col items-end gap-0.5">
              {entry.rebuy_count > 0 && (
                <span
                  className="text-[10px] font-semibold tracking-wider text-[#8b949e]"
                  style={{ fontFamily: 'var(--font-barlow)' }}
                >
                  R×{entry.rebuy_count}{' '}
                  <span style={{ color: '#6e7681' }}>
                    ({((entryFee + bountyAmount) * (entry.rebuy_count + 1)).toLocaleString()}₽)
                  </span>
                </span>
              )}
              <span
                className="flex items-center gap-1 text-[10px]"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                <Ticket size={9} style={{ color: '#6e7681', flexShrink: 0 }} />
                <span style={{ color: '#6e7681' }}>
                    {(entryFee * (entry.rebuy_count + 1)).toLocaleString()}<span style={{ fontSize: 7 }}> ₽</span>
                </span>
                <span style={{ color: '#30363d' }}>/</span>
                <Crosshair size={9} style={{ color: '#7f1d1d', flexShrink: 0 }} />
                <span style={{ color: '#ef4444' }}>
                    {(bountyAmount * (entry.rebuy_count + 1)).toLocaleString()}<span style={{ fontSize: 7 }}> ₽</span>
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Player name */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-base font-bold leading-tight"
            style={{
              fontFamily: 'var(--font-barlow)',
              color: isEliminated ? '#484f58' : '#e6edf3',
              textDecoration: isEliminated ? 'line-through' : 'none',
              textDecorationColor: '#484f58',
            }}
          >
            {displayName.toUpperCase()}
          </span>
          {isWinner && (
            <span
              className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: '#3d2e00', color: '#d4af37', fontFamily: 'var(--font-barlow)' }}
            >
              ПОБЕДИТЕЛЬ
            </span>
          )}
        </div>
        {entry.player.nickname && (
          <span className="text-[11px] text-[#484f58]" style={{ fontFamily: 'var(--font-barlow)' }}>
            {entry.player.name}
          </span>
        )}
      </div>

      {/* Bounty row */}
      <div
        className="mx-3 mb-3 px-2 py-1.5 rounded flex items-center justify-between"
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
              color: isEliminated || isWinner ? '#484f58' : '#d4af37',
            }}
          >
            {entry.current_bounty.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span>
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
            {entry.guaranteed_bounty.toLocaleString()}<span style={{ fontSize: '0.65em' }}> ₽</span>
          </span>
        </div>
      </div>
    </div>
  )
}
