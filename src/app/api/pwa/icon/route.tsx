import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const size = Math.min(
    512,
    Math.max(16, parseInt(request.nextUrl.searchParams.get('size') ?? '192', 10)),
  )
  const fontSize = Math.round(size * 0.55)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: '#1a4731',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#d4af37',
            fontSize,
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          S
        </span>
      </div>
    ),
    { width: size, height: size },
  )
}
