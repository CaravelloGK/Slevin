'use client'

import { useRef, useState, useTransition } from 'react'
import { changePassword } from './actions'

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(formRef.current!)
    startTransition(async () => {
      const result = await changePassword(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        formRef.current?.reset()
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#e6edf3',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#8b949e',
    marginBottom: '6px',
    display: 'block',
  }

  return (
    <div
      className="rounded-lg p-5"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      <h2 className="text-sm font-semibold text-[#e6edf3] mb-4">Сменить пароль</h2>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label style={labelStyle}>Текущий пароль</label>
          <input
            type="password"
            name="current_password"
            autoComplete="current-password"
            disabled={isPending}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Новый пароль</label>
          <input
            type="password"
            name="new_password"
            autoComplete="new-password"
            disabled={isPending}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Повторите новый пароль</label>
          <input
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            disabled={isPending}
            style={inputStyle}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: '#da3633' }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm" style={{ color: '#2ea043' }}>
            Пароль успешно изменён
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 rounded-lg text-sm font-semibold tracking-wide transition-opacity"
          style={{
            background: '#21262d',
            border: '1px solid #30363d',
            color: isPending ? '#484f58' : '#e6edf3',
            cursor: isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Сохранение...' : 'Сменить пароль'}
        </button>
      </form>
    </div>
  )
}
