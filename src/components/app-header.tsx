import Link from 'next/link'

interface AppHeaderProps {
  role?: string
}

export function AppHeader({ role }: AppHeaderProps) {
  return (
    <header
      className="flex items-center gap-3 px-4 shrink-0"
      style={{
        height: 48,
        background: '#0d1117',
        borderBottom: '1px solid #30363d',
      }}
    >
      <Link href="/" className="flex items-center gap-2 group" aria-label="Главное меню">
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold group-hover:opacity-75 transition-opacity"
          style={{ background: '#1a4731', color: '#d4af37' }}
        >
          S
        </div>
        <span className="text-sm font-semibold tracking-widest text-[#e6edf3] group-hover:text-[#d4af37] transition-colors uppercase">
          Slevin
        </span>
      </Link>
      <div className="flex-1" />
      {role && (
        <span className="text-xs uppercase tracking-widest" style={{ color: '#484f58' }}>
          {roleLabel(role)}
        </span>
      )}
    </header>
  )
}

function roleLabel(role: string): string {
  if (role === 'admin') return 'Администратор'
  if (role === 'dealer') return 'Дилер'
  return 'Игрок'
}
