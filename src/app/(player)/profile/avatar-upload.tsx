'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@/lib/supabase/client'
import { updateAvatarUrl } from './actions'

interface Props {
  userId: string
  currentAvatarUrl: string | null
  playerName: string
}

export function AvatarUpload({ userId, currentAvatarUrl, playerName }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = playerName.slice(0, 2).toUpperCase()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('Максимальный размер файла — 2MB')
      return
    }

    setUploading(true)
    setError('')

    const supabase = createBrowserClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Ошибка загрузки файла')
      setUploading(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(path)

    const result = await updateAvatarUrl(publicUrl)
    if (result.success) {
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
    } else {
      setError(result.error)
    }
    setUploading(false)
  }

  return (
    <div
      className="rounded-lg p-6 flex flex-col gap-4"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      <p className="text-[10px] tracking-[0.3em] text-[#484f58] uppercase font-semibold">Фото</p>

      <div className="flex items-center gap-5">
        <div
          className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 relative"
          style={{ background: '#1a4731', border: '2px solid #30363d' }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Аватар"
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <span
              className="text-xl font-bold"
              style={{ color: '#d4af37', fontFamily: 'var(--font-space-mono)' }}
            >
              {initials}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{ background: '#21262d', color: '#e6edf3', border: '1px solid #30363d' }}
          >
            {uploading ? 'Загрузка...' : 'Изменить фото'}
          </button>
          <p className="text-[11px] text-[#484f58]">JPEG, PNG или WEBP, до 2MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {error && <p className="text-sm text-[#f85149]">{error}</p>}
    </div>
  )
}
