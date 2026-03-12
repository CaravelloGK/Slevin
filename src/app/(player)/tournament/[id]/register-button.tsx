'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registerForTournament, unregisterFromTournament } from './actions'

interface Props {
  tournamentId: string
  isRegistered: boolean
}

export function RegisterButton({ tournamentId, isRegistered }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleRegister() {
    setError('')
    startTransition(async () => {
      const result = await registerForTournament(tournamentId)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  function handleUnregister() {
    setError('')
    startTransition(async () => {
      const result = await unregisterFromTournament(tournamentId)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  if (isRegistered) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="rounded-lg px-5 py-3 text-sm font-semibold text-center"
          style={{ background: '#1a4731', color: '#2ea043' }}
        >
          Вы зарегистрированы
        </div>
        <button
          onClick={handleUnregister}
          disabled={isPending}
          className="rounded-lg px-5 py-2 text-sm font-medium tracking-wide transition-opacity disabled:opacity-50 text-center"
          style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
        >
          {isPending ? 'Отмена...' : 'Отменить регистрацию'}
        </button>
        {error && <p className="text-sm text-[#f85149]">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRegister}
        disabled={isPending}
        className="rounded-lg px-5 py-3 text-sm font-bold tracking-widest uppercase transition-opacity disabled:opacity-50"
        style={{ background: '#d4af37', color: '#0d1117' }}
      >
        {isPending ? 'Регистрация...' : 'Зарегистрироваться'}
      </button>
      {error && <p className="text-sm text-[#f85149]">{error}</p>}
    </div>
  )
}
