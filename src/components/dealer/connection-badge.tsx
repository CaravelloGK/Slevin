'use client'

interface ConnectionBadgeProps {
  connected: boolean
  pendingCount: number
  isOnline: boolean
}

export function ConnectionBadge({ connected, pendingCount, isOnline }: ConnectionBadgeProps) {
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2">
        {pendingCount > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              background: '#3d2a00',
              color: '#d29922',
              fontFamily: 'var(--font-space-mono)',
            }}
          >
            {pendingCount} ОЖИД.
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#d29922] animate-pulse" />
          <span
            className="text-xs font-semibold tracking-widest text-[#d29922]"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            ОФЛАЙН
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          connected ? 'bg-[#2ea043]' : 'bg-[#8b949e] animate-pulse'
        }`}
      />
      <span
        className={`text-xs font-semibold tracking-widest ${
          connected ? 'text-[#2ea043]' : 'text-[#8b949e]'
        }`}
        style={{ fontFamily: 'var(--font-barlow)' }}
      >
        {connected ? 'В ЭФИРЕ' : 'ПОДКЛЮЧЕНИЕ'}
      </span>
    </div>
  )
}
