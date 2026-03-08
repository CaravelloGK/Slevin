'use client'

interface EndTournamentDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

export function EndTournamentDialog({ onConfirm, onCancel }: EndTournamentDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="rounded-lg border p-6 w-[340px] flex flex-col gap-5"
        style={{
          background: '#161b22',
          borderColor: '#da3633',
          boxShadow: '0 0 32px rgba(218,54,51,0.2)',
        }}
      >
        <div className="flex flex-col gap-1">
          <span
            className="text-base font-bold tracking-[0.1em] uppercase text-[#da3633]"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            Завершить турнир
          </span>
          <span
            className="text-sm text-[#8b949e]"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Турнир будет завершён досрочно. Это действие нельзя отменить.
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded text-[12px] font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
            style={{
              background: '#21262d',
              color: '#8b949e',
              border: '1px solid #30363d',
              fontFamily: 'var(--font-barlow)',
            }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded text-[12px] font-bold tracking-widest uppercase transition-all duration-150 active:scale-95"
            style={{
              background: '#3d1f1f',
              color: '#da3633',
              border: '1px solid #da3633',
              fontFamily: 'var(--font-barlow)',
            }}
          >
            Завершить
          </button>
        </div>
      </div>
    </div>
  )
}
