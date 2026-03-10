'use client'

import type { BlindLevel } from '@/types/tournament'

interface LevelUpDialogProps {
  currentLevel: number
  nextLevel: BlindLevel | undefined
  onConfirm: () => void
  onCancel: () => void
}

export function LevelUpDialog({
  currentLevel,
  nextLevel,
  onConfirm,
  onCancel,
}: LevelUpDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="flex flex-col items-center text-center"
        style={{
          background: '#161b22',
          border: '1px solid #d29922',
          borderRadius: '14px',
          padding: '36px 40px',
          width: 'min(420px, 90vw)',
          boxShadow: '0 0 40px rgba(210,153,34,0.15)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#1a1200',
            border: '2px solid #d29922',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#d29922">
            <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: '28px',
            color: '#e6edf3',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Уровень {currentLevel} завершён
        </div>

        <div
          style={{
            fontFamily: 'var(--font-barlow)',
            fontSize: '13px',
            color: '#8b949e',
            marginBottom: 24,
          }}
        >
          Раздача закончилась? Переходим на следующий уровень?
        </div>

        {/* Next level info */}
        {nextLevel && !nextLevel.is_break && (
          <div
            style={{
              background: '#0d1117',
              border: '1px solid #21262d',
              borderRadius: '8px',
              padding: '12px 20px',
              marginBottom: 28,
              width: '100%',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-barlow)',
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: '#484f58',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Уровень {nextLevel.level_number}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '20px',
                fontWeight: 700,
                color: '#e6edf3',
              }}
            >
              {nextLevel.small_blind.toLocaleString()} / {nextLevel.big_blind.toLocaleString()}
            </div>
            {nextLevel.ante > 0 && (
              <div
                style={{
                  fontFamily: 'var(--font-barlow)',
                  fontSize: '12px',
                  color: '#8b949e',
                  marginTop: 2,
                }}
              >
                Анте: {nextLevel.ante.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {nextLevel?.is_break && (
          <div
            style={{
              background: '#0d1117',
              border: '1px solid #21262d',
              borderRadius: '8px',
              padding: '12px 20px',
              marginBottom: 28,
              width: '100%',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-barlow)',
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: '#484f58',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Следующий
            </div>
            <div
              style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: '22px',
                color: '#8b949e',
                letterSpacing: '0.1em',
              }}
            >
              Перерыв {nextLevel.duration_minutes} мин.
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: '1px solid #30363d',
              borderRadius: '8px',
              color: '#8b949e',
              fontFamily: 'var(--font-barlow)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Ещё идёт
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 2,
              padding: '10px',
              background: '#1a2a1a',
              border: '1px solid #2ea043',
              borderRadius: '8px',
              color: '#2ea043',
              fontFamily: 'var(--font-barlow)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Следующий уровень
          </button>
        </div>
      </div>
    </div>
  )
}
