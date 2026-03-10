'use client'

import { useState } from 'react'
import { registerForTournament } from './actions'

interface Props {
  tournamentId: string
}

export function RegisterButton({ tournamentId }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleClick() {
    setStatus('loading')
    const result = await registerForTournament(tournamentId)
    if (result.success) {
      setStatus('done')
    } else {
      setStatus('error')
      setError(result.error)
    }
  }

  if (status === 'done') {
    return (
      <div
        className="rounded-lg px-5 py-3 text-sm font-semibold text-center"
        style={{ background: '#1a4731', color: '#2ea043' }}
      >
        Вы зарегистрированы
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="rounded-lg px-5 py-3 text-sm font-bold tracking-widest uppercase transition-opacity disabled:opacity-50"
        style={{ background: '#d4af37', color: '#0d1117' }}
      >
        {status === 'loading' ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>
      {status === 'error' && <p className="text-sm text-[#f85149]">{error}</p>}
    </div>
  )
}
