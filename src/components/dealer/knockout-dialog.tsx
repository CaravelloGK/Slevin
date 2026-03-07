'use client'

import { useState } from 'react'
import type { TournamentPlayerWithProfile } from '@/types/tournament'
import { PlayerCard } from './player-card'

interface KnockoutDialogProps {
  victim: TournamentPlayerWithProfile
  allPlayers: TournamentPlayerWithProfile[]
  bountyAmount: number
  onConfirm: (killerId: string, victimId: string) => Promise<void>
  onCancel: () => void
}

export function KnockoutDialog({
  victim,
  allPlayers,
  bountyAmount,
  onConfirm,
  onCancel,
}: KnockoutDialogProps) {
  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const eligibleKillers = allPlayers.filter(
    (p) => p.id !== victim.id && p.status !== 'eliminated',
  )

  const selectedKiller = eligibleKillers.find((p) => p.id === selectedKillerId)
  const bountyTransfer = Math.floor(victim.current_bounty * 0.5)

  async function handleConfirm() {
    if (!selectedKillerId) return
    setConfirming(true)
    try {
      await onConfirm(selectedKillerId, victim.id)
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
        className="w-full max-w-2xl mx-4 rounded-xl border overflow-hidden"
        style={{ background: '#161b22', borderColor: '#30363d' }}
      >
        {/* Dialog header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: '#30363d', background: '#0d1117' }}
        >
          <div>
            <div
              className="text-[10px] tracking-[0.25em] text-[#da3633] uppercase font-semibold"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Elimination
            </div>
            <div
              className="text-xl font-bold text-[#e6edf3]"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              {(victim.player.nickname ?? victim.player.name).toUpperCase()} — OUT
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[#8b949e] hover:text-[#e6edf3] text-2xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step 1: select killer */}
        {!selectedKillerId && (
          <div className="p-6">
            <p
              className="text-xs tracking-[0.2em] text-[#8b949e] uppercase mb-4 font-semibold"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Who eliminated {(victim.player.nickname ?? victim.player.name).toUpperCase()}?
            </p>
            <div className="grid grid-cols-3 gap-3" style={{ minHeight: 140 }}>
              {eligibleKillers.map((killer) => (
                <div key={killer.id} style={{ height: 120 }}>
                  <PlayerCard
                    entry={killer}
                    onKnockout={() => {}}
                    onRebuy={() => {}}
                    isSelectingKiller
                    onSelectAsKiller={(p) => setSelectedKillerId(p.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: confirm */}
        {selectedKillerId && selectedKiller && (
          <div className="p-6">
            <div
              className="rounded-lg border p-4 mb-6"
              style={{ background: '#0d1117', borderColor: '#30363d' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <div
                    className="text-[10px] tracking-[0.2em] text-[#2ea043] uppercase"
                    style={{ fontFamily: 'var(--font-barlow)' }}
                  >
                    Killer
                  </div>
                  <div
                    className="text-2xl font-bold text-[#e6edf3]"
                    style={{ fontFamily: 'var(--font-barlow)' }}
                  >
                    {(selectedKiller.player.nickname ?? selectedKiller.player.name).toUpperCase()}
                  </div>
                </div>
                <div
                  className="text-3xl text-[#30363d]"
                  style={{ fontFamily: 'var(--font-bebas)' }}
                >
                  ⚡
                </div>
                <div className="text-center">
                  <div
                    className="text-[10px] tracking-[0.2em] text-[#da3633] uppercase"
                    style={{ fontFamily: 'var(--font-barlow)' }}
                  >
                    Victim
                  </div>
                  <div
                    className="text-2xl font-bold text-[#8b949e] line-through"
                    style={{ fontFamily: 'var(--font-barlow)' }}
                  >
                    {(victim.player.nickname ?? victim.player.name).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Bounty transfer preview */}
              <div
                className="rounded p-3 text-center"
                style={{ background: '#161b22', border: '1px solid #1a4731' }}
              >
                <div
                  className="text-[10px] tracking-[0.2em] text-[#8b949e] uppercase mb-1"
                  style={{ fontFamily: 'var(--font-barlow)' }}
                >
                  Bounty Transfer
                </div>
                <div
                  className="text-3xl font-bold text-[#d4af37]"
                  style={{ fontFamily: 'var(--font-space-mono)' }}
                >
                  +◈{bountyTransfer.toLocaleString()}
                </div>
                <div
                  className="text-[11px] text-[#8b949e] mt-1"
                  style={{ fontFamily: 'var(--font-barlow)' }}
                >
                  50% of ◈{victim.current_bounty.toLocaleString()} → {(selectedKiller.player.nickname ?? selectedKiller.player.name).toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedKillerId(null)}
                className="px-4 py-3 rounded text-sm font-semibold tracking-widest uppercase transition-colors"
                style={{
                  background: '#21262d',
                  color: '#8b949e',
                  border: '1px solid #30363d',
                  fontFamily: 'var(--font-barlow)',
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 py-3 rounded text-sm font-bold tracking-widest uppercase transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: confirming ? '#1a0a0a' : '#da3633',
                  color: '#ffffff',
                  fontFamily: 'var(--font-barlow)',
                }}
              >
                {confirming ? 'Processing...' : 'CONFIRM ELIMINATION'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
