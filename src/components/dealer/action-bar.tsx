'use client'

import { HelpMenu } from './help-menu'

interface ActionBarProps {
  tournamentId: string
  isPaused: boolean
  isMuted: boolean
  activePlayers: number
  totalPlayers: number
  currentLevel: number
  secondsLeft: number
  onPause: (secondsLeft: number) => void
  onResume: (secondsLeft: number) => void
  onPrevLevel: () => void
  onNextLevel: () => void
  onEndTournament: () => void
  onToggleMute: () => void
}

export function ActionBar({
  isPaused,
  isMuted,
  activePlayers,
  totalPlayers,
  currentLevel,
  secondsLeft,
  onPause,
  onResume,
  onPrevLevel,
  onNextLevel,
  onEndTournament,
  onToggleMute,
}: ActionBarProps) {
  return (
    <footer
      className="flex items-center justify-between px-5 shrink-0"
      style={{
        height: 56,
        background: '#0d1117',
        borderTop: '1px solid #30363d',
      }}
    >
      {/* Left: timer controls */}
      <div className="flex items-center gap-2">
        {/* Pause / Resume */}
        <button
          onClick={() => (isPaused ? onResume(secondsLeft) : onPause(secondsLeft))}
          className="px-4 py-2 rounded text-xs font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
          style={{
            background: isPaused ? '#1a4731' : '#21262d',
            color: isPaused ? '#2ea043' : '#8b949e',
            border: `1px solid ${isPaused ? '#2ea043' : '#30363d'}`,
            fontFamily: 'var(--font-barlow)',
          }}
        >
          {isPaused ? '▶ Продолжить' : '⏸ Пауза'}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#30363d]" />

        {/* Level nav */}
        <button
          onClick={onPrevLevel}
          disabled={currentLevel <= 1}
          className="px-3 py-2 rounded text-xs font-bold tracking-widest uppercase transition-all duration-150 active:scale-95 disabled:opacity-30"
          style={{
            background: '#21262d',
            color: '#8b949e',
            border: '1px solid #30363d',
            fontFamily: 'var(--font-barlow)',
          }}
        >
          ← Назад
        </button>
        <button
          onClick={onNextLevel}
          className="px-3 py-2 rounded text-xs font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
          style={{
            background: '#21262d',
            color: '#8b949e',
            border: '1px solid #30363d',
            fontFamily: 'var(--font-barlow)',
          }}
        >
          Вперёд →
        </button>
      </div>

      {/* Center: player count */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] tracking-[0.2em] text-[#484f58] uppercase"
          style={{ fontFamily: 'var(--font-barlow)' }}
        >
          Игроки
        </span>
        <span
          className="text-lg font-bold text-[#e6edf3] tabular-nums"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {activePlayers}
          <span className="text-[#484f58] text-sm">/{totalPlayers}</span>
        </span>
      </div>

      {/* Right: mute + end tournament + status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMute}
          className="px-3 py-2 rounded text-xs font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
          style={{
            background: isMuted ? '#1a0505' : '#21262d',
            color: isMuted ? '#ef4444' : '#8b949e',
            border: `1px solid ${isMuted ? '#7f1d1d' : '#30363d'}`,
            fontFamily: 'var(--font-barlow)',
          }}
        >
          {isMuted ? 'Звук выкл' : 'Звук вкл'}
        </button>
        <div className="w-px h-5 bg-[#30363d]" />
        <button
          onClick={onEndTournament}
          className="px-3 py-2 rounded text-xs font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
          style={{
            background: '#1a0a0a',
            color: '#da3633',
            border: '1px solid #3d1f1f',
            fontFamily: 'var(--font-barlow)',
          }}
        >
          Завершить
        </button>
        <div
          className="text-xs tracking-[0.3em] uppercase font-semibold"
          style={{
            fontFamily: 'var(--font-barlow)',
            color: isPaused ? '#d29922' : '#2ea043',
          }}
        >
          {isPaused ? '⏸ Пауза' : '● Идёт'}
        </div>
        <div className="w-px h-5 bg-[#30363d]" />
        <HelpMenu />
      </div>
    </footer>
  )
}
