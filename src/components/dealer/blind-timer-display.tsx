'use client'

import { useBlindTimer, formatTime } from '@/hooks/use-blind-timer'
import type { BlindLevel, Tournament } from '@/types/tournament'

interface BlindTimerDisplayProps {
  tournament: Tournament
  currentLevel: BlindLevel | undefined
  nextLevel: BlindLevel | undefined
}

export function BlindTimerDisplay({ tournament, currentLevel, nextLevel }: BlindTimerDisplayProps) {
  const { secondsLeft, isPaused, progressPct } = useBlindTimer(tournament, currentLevel)

  const isUrgent = secondsLeft <= 60 && secondsLeft > 0 && !isPaused
  const timeColor = isPaused ? '#8b949e' : isUrgent ? '#da3633' : '#e6edf3'

  return (
    <div className="flex items-center gap-6">
      {/* Level badge */}
      <div className="flex flex-col items-center leading-none">
        <span
          className="text-[10px] font-semibold tracking-[0.2em] text-[#8b949e] uppercase"
          style={{ fontFamily: 'var(--font-barlow)' }}
        >
          Уровень
        </span>
        <span
          className="text-5xl leading-none text-[#e6edf3]"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          {tournament.current_level}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-[#30363d]" />

      {/* Blinds */}
      <div className="flex flex-col leading-none">
        <span
          className="text-[10px] font-semibold tracking-[0.2em] text-[#8b949e] uppercase"
          style={{ fontFamily: 'var(--font-barlow)' }}
        >
          Блайнды
        </span>
        <span
          className="text-xl font-bold text-[#e6edf3]"
          style={{ fontFamily: 'var(--font-space-mono)' }}
        >
          {currentLevel
            ? `${currentLevel.small_blind.toLocaleString()} / ${currentLevel.big_blind.toLocaleString()}`
            : '— / —'}
        </span>
        {currentLevel && currentLevel.ante > 0 && (
          <span
            className="text-[11px] text-[#8b949e]"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Анте: {currentLevel.ante.toLocaleString()}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-[#30363d]" />

      {/* Timer */}
      <div className="flex flex-col items-center leading-none">
        <span
          className="text-[10px] font-semibold tracking-[0.2em] text-[#8b949e] uppercase"
          style={{ fontFamily: 'var(--font-barlow)' }}
        >
          {isPaused ? 'Пауза' : 'Время'}
        </span>
        <span
          className="text-5xl leading-none tabular-nums transition-colors duration-300"
          style={{ fontFamily: 'var(--font-bebas)', color: timeColor, letterSpacing: '0.05em' }}
        >
          {formatTime(secondsLeft)}
        </span>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-[#21262d] rounded-full mt-1 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progressPct}%`,
              background: isUrgent ? '#da3633' : '#2ea043',
            }}
          />
        </div>
      </div>

      {/* Next level hint */}
      {nextLevel && (
        <>
          <div className="w-px h-10 bg-[#30363d]" />
          <div className="flex flex-col leading-none">
            <span
              className="text-[10px] font-semibold tracking-[0.2em] text-[#8b949e] uppercase"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Следующий
            </span>
            <span
              className="text-sm text-[#8b949e]"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {nextLevel.small_blind.toLocaleString()} / {nextLevel.big_blind.toLocaleString()}
            </span>
            {nextLevel.ante > 0 && (
              <span
                className="text-[11px] text-[#484f58]"
                style={{ fontFamily: 'var(--font-barlow)' }}
              >
                Анте: {nextLevel.ante.toLocaleString()}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
