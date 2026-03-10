import Link from 'next/link'
import Image from 'next/image'

interface TournamentPosterCardProps {
  id: string
  name: string
  posterUrl: string | null
  date: string | null
  href: string
  participated?: boolean
}

export function TournamentPosterCard({
  name,
  posterUrl,
  date,
  href,
  participated,
}: TournamentPosterCardProps) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Moscow',
      })
    : null

  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-lg overflow-hidden"
      style={{ background: '#161b22', border: '1px solid #21262d', aspectRatio: '2/3' }}
    >
      {/* Poster or gradient placeholder */}
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 200px"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-end justify-start p-3"
          style={{
            background:
              'linear-gradient(135deg, #1a2634 0%, #0d1117 60%, #1a1a0a 100%)',
          }}
        />
      )}

      {/* Bottom gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(13,17,23,0.97) 0%, rgba(13,17,23,0.4) 45%, transparent 100%)',
        }}
      />

      {/* Hover border highlight */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.4)' }}
      />

      {/* Participated badge */}
      {participated && (
        <div
          className="absolute top-2 left-2 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded uppercase"
          style={{ background: '#1a4731', color: '#2ea043' }}
        >
          Участвовал
        </div>
      )}

      {/* Name + date at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-0.5">
        <p
          className="text-xs font-bold leading-tight line-clamp-2 uppercase"
          style={{ color: '#e6edf3', fontFamily: 'var(--font-barlow)' }}
        >
          {name}
        </p>
        {formattedDate && (
          <p
            className="text-[10px]"
            style={{ color: '#484f58', fontFamily: 'var(--font-space-mono)' }}
          >
            {formattedDate}
          </p>
        )}
      </div>
    </Link>
  )
}
