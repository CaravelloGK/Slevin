'use client'

import { useRef, useState, useTransition } from 'react'
import { updateProfile, changePassword } from './actions'

interface Props {
  initialName: string
  initialNickname: string | null
}

export function ProfileForm({ initialName, initialNickname }: Props) {
  const [name, setName] = useState(initialName)
  const [nickname, setNickname] = useState(initialNickname ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [isPwPending, startPwTransition] = useTransition()
  const pwFormRef = useRef<HTMLFormElement>(null)

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

  function handleOpenPwModal() {
    setPwError(null)
    setPwSuccess(false)
    pwFormRef.current?.reset()
    setPwModalOpen(true)
  }

  function handleClosePwModal() {
    setPwModalOpen(false)
    setPwError(null)
    setPwSuccess(false)
  }

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    const fd = new FormData(pwFormRef.current!)
    startPwTransition(async () => {
      const result = await changePassword(fd)
      if (!result.success) {
        setPwError(result.error)
      } else {
        setPwSuccess(true)
        pwFormRef.current?.reset()
        setTimeout(() => handleClosePwModal(), 1500)
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#e6edf3',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <>
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
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#484f58]">Отображается вместо имени в турнирах</p>
              <button
                type="button"
                onClick={handleOpenPwModal}
                className="text-[11px] text-[#484f58] hover:text-[#8b949e] transition-colors underline underline-offset-2"
              >
                Сменить пароль
              </button>
            </div>
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

      {/* Change password modal */}
      {pwModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClosePwModal() }}
        >
          <div
            className="flex flex-col"
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              width: 'min(400px, 92vw)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #21262d' }}
            >
              <span
                className="text-sm font-semibold text-[#e6edf3]"
              >
                Смена пароля
              </span>
              <button
                onClick={handleClosePwModal}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8b949e', padding: '2px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form ref={pwFormRef} onSubmit={handlePwSubmit} className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Текущий пароль
                </label>
                <input type="password" name="current_password" autoComplete="current-password" disabled={isPwPending} style={inputStyle} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Новый пароль
                </label>
                <input type="password" name="new_password" autoComplete="new-password" disabled={isPwPending} style={inputStyle} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Повторите новый пароль
                </label>
                <input type="password" name="confirm_password" autoComplete="new-password" disabled={isPwPending} style={inputStyle} />
              </div>

              {pwError && <p className="text-sm" style={{ color: '#da3633' }}>{pwError}</p>}
              {pwSuccess && <p className="text-sm" style={{ color: '#2ea043' }}>Пароль успешно изменён</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClosePwModal}
                  disabled={isPwPending}
                  className="flex-1 py-2 rounded text-sm font-semibold"
                  style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPwPending}
                  className="flex-1 py-2 rounded text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', cursor: isPwPending ? 'not-allowed' : 'pointer' }}
                >
                  {isPwPending ? 'Сохранение...' : 'Сменить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
