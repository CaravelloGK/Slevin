'use client'

import { useState } from 'react'
import { updateProfile } from './actions'

interface Props {
  initialName: string
  initialNickname: string | null
}

export function ProfileForm({ initialName, initialNickname }: Props) {
  const [name, setName] = useState(initialName)
  const [nickname, setNickname] = useState(initialNickname ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    const fd = new FormData()
    fd.append('name', name)
    fd.append('nickname', nickname)
    const result = await updateProfile(fd)
    if (result.success) {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
      setErrorMsg(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div
        className="rounded-lg p-6 flex flex-col gap-5"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        <p className="text-[10px] tracking-[0.3em] text-[#484f58] uppercase font-semibold">
          Данные профиля
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8b949e] uppercase tracking-widest font-semibold">
            Имя
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded px-3 py-2 text-sm text-[#e6edf3] outline-none focus:ring-1 focus:ring-[#d4af37]"
            style={{ background: '#0d1117', border: '1px solid #30363d' }}
            maxLength={60}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#8b949e] uppercase tracking-widest font-semibold">
            Никнейм
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Только a-z, 0-9, _"
            className="rounded px-3 py-2 text-sm text-[#e6edf3] outline-none focus:ring-1 focus:ring-[#d4af37]"
            style={{ background: '#0d1117', border: '1px solid #30363d' }}
            maxLength={20}
            pattern="^[a-zA-Z0-9_]*$"
          />
          <p className="text-[11px] text-[#484f58]">Отображается вместо имени в турнирах</p>
        </div>
      </div>

      {status === 'error' && <p className="text-sm text-[#f85149]">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'saving'}
        className="rounded px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: '#1a4731', color: '#d4af37' }}
      >
        {status === 'saving' ? 'Сохранение...' : status === 'saved' ? 'Сохранено' : 'Сохранить'}
      </button>
    </form>
  )
}
