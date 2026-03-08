'use client'

import { useState } from 'react'
import type { TournamentPlayerWithProfile } from '@/types/tournament'

interface RebuyDialogProps {
  player: TournamentPlayerWithProfile
  bountyAmount: number
  onConfirm: (playerId: string) => Promise<void>
  onCancel: () => void
}

export function RebuyDialog({ player, bountyAmount, onConfirm, onCancel }: RebuyDialogProps) {
  const [confirming, setConfirming] = useState(false)

  const displayName = player.player.nickname ?? player.player.name
  const newCurrentBounty = player.current_bounty + bountyAmount

  async function handleConfirm() {
    setConfirming(true)
    try {
      await onConfirm(player.player_id)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl border overflow-hidden"
        style={{ background: '#161b22', borderColor: '#30363d' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: '#30363d', background: '#0d1117' }}
        >
          <div>
            <div
              className="text-[10px] tracking-[0.25em] text-[#d29922] uppercase font-semibold"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Ребай
            </div>
            <div
              className="text-xl font-bold text-[#e6edf3]"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              {displayName.toUpperCase()}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[#8b949e] hover:text-[#e6edf3] text-2xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Rebuy count info */}
          <div
            className="rounded-lg border p-4 mb-6 text-center"
            style={{ background: '#0d1117', borderColor: '#3d2a00' }}
          >
            <div
              className="text-[10px] tracking-[0.2em] text-[#8b949e] uppercase mb-3"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Ребай №{player.rebuy_count + 1}
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div
                  className="text-[10px] text-[#8b949e] tracking-wider uppercase"
                  style={{ fontFamily: 'var(--font-barlow)' }}
                >
                  Сейчас
                </div>
                <div
                  className="text-2xl font-bold text-[#484f58]"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                >
                  ◈{player.current_bounty.toLocaleString()}
                </div>
              </div>

              <div
                className="text-3xl text-[#d29922]"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                →
              </div>

              <div className="text-center">
                <div
                  className="text-[10px] text-[#d29922] tracking-wider uppercase"
                  style={{ fontFamily: 'var(--font-barlow)' }}
                >
                  После ребая
                </div>
                <div
                  className="text-2xl font-bold text-[#d4af37]"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                >
                  ◈{newCurrentBounty.toLocaleString()}
                </div>
              </div>
            </div>

            <div
              className="text-[11px] text-[#8b949e] mt-3"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Зафиксировано ★{player.guaranteed_bounty.toLocaleString()} — без изменений
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-3 rounded text-sm font-semibold tracking-widest uppercase transition-colors"
              style={{
                background: '#21262d',
                color: '#8b949e',
                border: '1px solid #30363d',
                fontFamily: 'var(--font-barlow)',
              }}
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 py-3 rounded text-sm font-bold tracking-widest uppercase transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: confirming ? '#1a1200' : '#d29922',
                color: '#000000',
                fontFamily: 'var(--font-barlow)',
              }}
            >
              {confirming ? 'Обработка...' : 'ПОДТВЕРДИТЬ РЕБАЙ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
