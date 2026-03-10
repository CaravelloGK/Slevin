'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { adjustPlayerCard, jumpToLevel, updateBlindLevelOverrides } from '@/lib/actions/tournament'
import type { TournamentPlayerWithProfile, BlindLevel, Tournament } from '@/types/tournament'

interface EditPlayerDialogProps {
  player: TournamentPlayerWithProfile
  tournament: Tournament
  blindLevels: BlindLevel[]
  onClose: () => void
  onBlindLevelsChange: (levels: BlindLevel[]) => void
}

const INPUT_STYLE: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid #30363d',
  color: '#e6edf3',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '14px',
  fontFamily: 'var(--font-space-mono)',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.1em',
  color: '#8b949e',
  fontFamily: 'var(--font-barlow)',
  textTransform: 'uppercase',
  marginBottom: '4px',
  display: 'block',
}

export function EditPlayerDialog({
  player,
  tournament,
  blindLevels,
  onClose,
  onBlindLevelsChange,
}: EditPlayerDialogProps) {
  const [activeTab, setActiveTab] = useState<'player' | 'structure'>('player')
  const [saving, setSaving] = useState(false)

  // Player tab state
  const [currentBounty, setCurrentBounty] = useState(String(player.current_bounty))
  const [guaranteedBounty, setGuaranteedBounty] = useState(String(player.guaranteed_bounty))
  const [rebuyCount, setRebuyCount] = useState(String(player.rebuy_count))
  const [seatNumber, setSeatNumber] = useState(String(player.seat_number ?? ''))
  const [status, setStatus] = useState<'active' | 'eliminated' | 'winner'>(player.status)

  // Structure tab state — editable copy of blind levels
  const [editedLevels, setEditedLevels] = useState<BlindLevel[]>([...blindLevels])
  const [jumpTarget, setJumpTarget] = useState(String(tournament.current_level))

  const displayName = player.player.nickname ?? player.player.name

  async function handleSavePlayer() {
    setSaving(true)
    const result = await adjustPlayerCard({
      tournament_player_id: player.id,
      tournament_id: player.tournament_id,
      current_bounty: Math.max(0, parseInt(currentBounty) || 0),
      guaranteed_bounty: Math.max(0, parseInt(guaranteedBounty) || 0),
      rebuy_count: Math.max(0, parseInt(rebuyCount) || 0),
      seat_number: seatNumber ? parseInt(seatNumber) : null,
      status,
    })
    setSaving(false)
    if (!result.success) {
      toast.error(`Ошибка: ${result.error}`)
    } else {
      toast.success('Данные игрока обновлены')
      onClose()
    }
  }

  async function handleJumpToLevel() {
    const target = parseInt(jumpTarget)
    if (isNaN(target) || target < 1) return
    setSaving(true)
    const result = await jumpToLevel({ tournament_id: tournament.id, target_level: target })
    setSaving(false)
    if (!result.success) {
      toast.error(`Ошибка: ${result.error}`)
    } else {
      toast.success(`Переход на уровень ${target}`)
    }
  }

  async function handleSaveStructure() {
    setSaving(true)
    const overrides = editedLevels.map((l) => ({
      level_number: l.level_number,
      small_blind: l.small_blind,
      big_blind: l.big_blind,
      ante: l.ante,
      duration_minutes: l.duration_minutes,
    }))
    const result = await updateBlindLevelOverrides({ tournament_id: tournament.id, overrides })
    setSaving(false)
    if (!result.success) {
      toast.error(`Ошибка: ${result.error}`)
    } else {
      onBlindLevelsChange(editedLevels)
      toast.success('Структура обновлена для этого турнира')
    }
  }

  function updateLevel(
    levelNumber: number,
    field: 'small_blind' | 'big_blind' | 'ante' | 'duration_minutes',
    value: string,
  ) {
    setEditedLevels((prev) =>
      prev.map((l) =>
        l.level_number === levelNumber ? { ...l, [field]: parseInt(value) || 0 } : l,
      ),
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex flex-col"
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          width: 'min(620px, 95vw)',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #21262d' }}
        >
          <div className="flex items-center gap-3">
            {player.player.avatar_url ? (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #30363d',
                  flexShrink: 0,
                }}
              >
                <Image
                  src={player.player.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#21262d',
                  border: '2px solid #30363d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'var(--font-barlow)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#8b949e',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-barlow)',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: '#e6edf3',
                  lineHeight: 1.2,
                }}
              >
                {displayName.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-barlow)',
                  fontSize: '11px',
                  color: '#8b949e',
                  letterSpacing: '0.05em',
                }}
              >
                Seat {player.seat_number ?? '?'} — Редактирование
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#8b949e',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid #21262d' }}>
          {(['player', 'structure'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '12px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-barlow)',
                color: activeTab === tab ? '#e6edf3' : '#8b949e',
                borderBottom: activeTab === tab ? '2px solid #d4af37' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                border: 'none',
                borderBottomStyle: 'solid',
                borderBottomWidth: '2px',
                borderBottomColor: activeTab === tab ? '#d4af37' : 'transparent',
                transition: 'color 0.15s',
              }}
            >
              {tab === 'player' ? 'Игрок' : 'Структура'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ---- Player Tab ---- */}
          {activeTab === 'player' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                <div>
                  <label style={LABEL_STYLE}>Текущий баунти</label>
                  <input
                    type="number"
                    min="0"
                    value={currentBounty}
                    onChange={(e) => setCurrentBounty(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Зафиксированный баунти</label>
                  <input
                    type="number"
                    min="0"
                    value={guaranteedBounty}
                    onChange={(e) => setGuaranteedBounty(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Ре-энтри (кол-во)</label>
                  <input
                    type="number"
                    min="0"
                    value={rebuyCount}
                    onChange={(e) => setRebuyCount(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Место за столом</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>
              <div>
                <label style={LABEL_STYLE}>Статус</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as 'active' | 'eliminated' | 'winner')
                  }
                  style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                >
                  <option value="active">Активен</option>
                  <option value="eliminated">Выбыл</option>
                  <option value="winner">Победитель</option>
                </select>
              </div>
            </div>
          )}

          {/* ---- Structure Tab ---- */}
          {activeTab === 'structure' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Jump to level */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '12px',
                  padding: '14px',
                  background: '#0d1117',
                  border: '1px solid #21262d',
                  borderRadius: '8px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={LABEL_STYLE}>Перейти на уровень</label>
                  <select
                    value={jumpTarget}
                    onChange={(e) => setJumpTarget(e.target.value)}
                    style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                  >
                    {blindLevels.map((l) => (
                      <option key={l.level_number} value={String(l.level_number)}>
                        {l.is_break
                          ? `Ур. ${l.level_number} — Перерыв`
                          : `Ур. ${l.level_number} — ${l.small_blind.toLocaleString()}/${l.big_blind.toLocaleString()}`}
                        {l.level_number === tournament.current_level ? ' (текущий)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleJumpToLevel}
                  disabled={saving}
                  style={{
                    background: '#1a3a1a',
                    border: '1px solid #2ea043',
                    color: '#2ea043',
                    borderRadius: '6px',
                    padding: '7px 18px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-barlow)',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Перейти
                </button>
              </div>

              {/* Level editor table */}
              <div>
                <label style={{ ...LABEL_STYLE, marginBottom: '8px' }}>
                  Параметры уровней (только для этого турнира)
                </label>
                <div
                  style={{
                    border: '1px solid #21262d',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Table header */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 1fr 1fr 1fr 1fr',
                      background: '#0d1117',
                      padding: '6px 12px',
                      borderBottom: '1px solid #21262d',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#6e7681',
                      fontFamily: 'var(--font-barlow)',
                    }}
                  >
                    <span>Ур.</span>
                    <span>SB</span>
                    <span>BB</span>
                    <span>Анте</span>
                    <span>Мин.</span>
                  </div>

                  {/* Rows */}
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {editedLevels.map((level) => {
                      const isCurrent = level.level_number === tournament.current_level
                      return (
                        <div
                          key={level.level_number}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '44px 1fr 1fr 1fr 1fr',
                            alignItems: 'center',
                            padding: '5px 12px',
                            gap: '6px',
                            background: isCurrent ? '#1a2a1a' : 'transparent',
                            borderLeft: `3px solid ${isCurrent ? '#2ea043' : 'transparent'}`,
                            borderBottom: '1px solid #21262d',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-space-mono)',
                              fontSize: '13px',
                              color: isCurrent ? '#2ea043' : '#8b949e',
                              fontWeight: isCurrent ? 700 : 400,
                            }}
                          >
                            {level.is_break ? `${level.level_number}B` : level.level_number}
                          </span>

                          {level.is_break ? (
                            <span
                              style={{
                                gridColumn: '2 / 6',
                                fontSize: '11px',
                                color: '#6e7681',
                                fontFamily: 'var(--font-barlow)',
                              }}
                            >
                              Перерыв ({level.duration_minutes} мин.)
                            </span>
                          ) : (
                            (['small_blind', 'big_blind', 'ante', 'duration_minutes'] as const).map(
                              (field) => (
                                <input
                                  key={field}
                                  type="number"
                                  min="0"
                                  value={level[field]}
                                  onChange={(e) =>
                                    updateLevel(level.level_number, field, e.target.value)
                                  }
                                  style={{
                                    background: '#0d1117',
                                    border: '1px solid #21262d',
                                    color: '#e6edf3',
                                    borderRadius: '4px',
                                    padding: '3px 5px',
                                    fontSize: '12px',
                                    fontFamily: 'var(--font-space-mono)',
                                    width: '100%',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              ),
                            )
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid #21262d' }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #30363d',
              color: '#8b949e',
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '12px',
              fontFamily: 'var(--font-barlow)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <button
            onClick={activeTab === 'player' ? handleSavePlayer : handleSaveStructure}
            disabled={saving}
            style={{
              background: saving ? '#2a3a2a' : '#1a3a1a',
              border: '1px solid #2ea043',
              color: '#2ea043',
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '12px',
              fontFamily: 'var(--font-barlow)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
