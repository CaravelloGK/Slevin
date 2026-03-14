'use client'

import { useState, useRef, useEffect } from 'react'

// ─── Chip count data ──────────────────────────────────────────────────────────

const CHIP_DATA: Record<number, { denom: number; perPlayer: number }[]> = {
  6: [
    { denom: 1,   perPlayer: 13 },
    { denom: 5,   perPlayer: 16 },
    { denom: 25,  perPlayer: 15 },
    { denom: 50,  perPlayer: 10 },
    { denom: 100, perPlayer: 6  },
  ],
  7: [
    { denom: 1,   perPlayer: 14 },
    { denom: 5,   perPlayer: 16 },
    { denom: 25,  perPlayer: 10 },
    { denom: 50,  perPlayer: 10 },
    { denom: 100, perPlayer: 5  },
  ],
  8: [
    { denom: 1,   perPlayer: 11 },
    { denom: 5,   perPlayer: 13 },
    { denom: 25,  perPlayer: 12 },
    { denom: 50,  perPlayer: 8  },
    { denom: 100, perPlayer: 4  },
  ],
  9: [
    { denom: 1,   perPlayer: 10 },
    { denom: 5,   perPlayer: 12 },
    { denom: 25,  perPlayer: 9  },
    { denom: 50,  perPlayer: 7  },
    { denom: 100, perPlayer: 4  },
  ],
}

const CHIP_COLORS: Record<number, string> = {
  1:   '#e6edf3',
  5:   '#61afef',
  25:  '#98c379',
  50:  '#e5c07b',
  100: '#e06c75',
}

// ─── Poker hands data ────────────────────────────────────────────────────────

const POKER_HANDS = [
  {
    rank: 1,
    name: 'Роял-флеш',
    en: 'Royal Flush',
    cards: 'A K Q J 10',
    suit: true,
    description: 'Туз, Король, Дама, Валет и Десятка одной масти.',
    example: '♠A ♠K ♠Q ♠J ♠10',
    color: '#d4af37',
  },
  {
    rank: 2,
    name: 'Стрит-флеш',
    en: 'Straight Flush',
    cards: '5 карт по порядку',
    suit: true,
    description: 'Пять карт одной масти идущих подряд. При равенстве — по старшей.',
    example: '♥9 ♥8 ♥7 ♥6 ♥5',
    color: '#e06c75',
  },
  {
    rank: 3,
    name: 'Каре',
    en: 'Four of a Kind',
    cards: '4 карты одного достоинства',
    suit: false,
    description: 'Четыре карты одного достоинства. Пятая карта — кикер.',
    example: '♠K ♥K ♦K ♣K ♠7',
    color: '#c678dd',
  },
  {
    rank: 4,
    name: 'Фул-хаус',
    en: 'Full House',
    cards: 'Тройка + Пара',
    suit: false,
    description: 'Три карты одного достоинства и пара другого. Сравниваются по тройке.',
    example: '♠Q ♥Q ♦Q ♣9 ♥9',
    color: '#56b6c2',
  },
  {
    rank: 5,
    name: 'Флеш',
    en: 'Flush',
    cards: '5 карт одной масти',
    suit: true,
    description: 'Любые пять карт одной масти. При равенстве — по старшей карте.',
    example: '♦A ♦J ♦8 ♦5 ♦3',
    color: '#61afef',
  },
  {
    rank: 6,
    name: 'Стрит',
    en: 'Straight',
    cards: '5 карт по порядку',
    suit: false,
    description: 'Пять карт подряд любых мастей. Туз может быть старшим (A-K-Q-J-10) или младшим (5-4-3-2-A).',
    example: '♠10 ♥9 ♦8 ♣7 ♠6',
    color: '#98c379',
  },
  {
    rank: 7,
    name: 'Тройка',
    en: 'Three of a Kind',
    cards: '3 карты одного достоинства',
    suit: false,
    description: 'Три карты одного достоинства. Остальные две — кикеры.',
    example: '♠J ♥J ♦J ♣8 ♠3',
    color: '#8b949e',
  },
  {
    rank: 8,
    name: 'Две пары',
    en: 'Two Pair',
    cards: '2 пары + кикер',
    suit: false,
    description: 'Две пары разного достоинства. При равенстве — по старшей паре, затем по кикеру.',
    example: '♠A ♥A ♦9 ♣9 ♠K',
    color: '#8b949e',
  },
  {
    rank: 9,
    name: 'Пара',
    en: 'One Pair',
    cards: '2 карты одного достоинства',
    suit: false,
    description: 'Одна пара. Остальные три — кикеры.',
    example: '♠K ♥K ♦Q ♣J ♠7',
    color: '#8b949e',
  },
  {
    rank: 10,
    name: 'Старшая карта',
    en: 'High Card',
    cards: 'Нет комбинации',
    suit: false,
    description: 'Нет ни одной комбинации. Сравниваются по старшей карте.',
    example: '♠A ♥J ♦8 ♣5 ♠2',
    color: '#484f58',
  },
]

// ─── Poker Hands Modal ───────────────────────────────────────────────────────

function PokerHandsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-xl overflow-hidden"
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          width: 'min(92vw, 700px)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid #30363d' }}
        >
          <div>
            <p
              className="text-base font-bold text-[#e6edf3] tracking-wide"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Комбинации покера
            </p>
            <p className="text-[10px] text-[#484f58] uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow)' }}>
              от старшей к младшей
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
          {POKER_HANDS.map((hand) => (
            <div
              key={hand.rank}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: '#0d1117', border: '1px solid #21262d' }}
            >
              {/* Rank badge */}
              <div
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums"
                style={{ background: '#21262d', color: '#484f58', fontFamily: 'var(--font-space-mono)' }}
              >
                {hand.rank}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-sm font-bold"
                    style={{ color: hand.color, fontFamily: 'var(--font-barlow)' }}
                  >
                    {hand.name}
                  </span>
                  <span className="text-[10px] text-[#484f58] uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow)' }}>
                    {hand.en}
                  </span>
                </div>
                <p className="text-xs text-[#8b949e] mt-0.5 leading-snug">{hand.description}</p>
              </div>

              {/* Example */}
              <div
                className="shrink-0 text-[11px] text-[#484f58] text-right leading-snug"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                {hand.example}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Chip Count Modal ────────────────────────────────────────────────────────

function ChipCountModal({ onClose }: { onClose: () => void }) {
  const [players, setPlayers] = useState(6)
  const tabs = [6, 7, 8, 9]
  const rows = CHIP_DATA[players]
  const stackValue = rows.reduce((sum, r) => sum + r.denom * r.perPlayer, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-xl overflow-hidden"
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          width: 'min(92vw, 420px)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid #30363d' }}
        >
          <div>
            <p
              className="text-base font-bold text-[#e6edf3] tracking-wide"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Чип-каунт
            </p>
            <p className="text-[10px] text-[#484f58] uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow)' }}>
              раздача фишек · 2 докупа
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex shrink-0 px-4 pt-3 gap-1.5"
        >
          {tabs.map((n) => (
            <button
              key={n}
              onClick={() => setPlayers(n)}
              className="flex-1 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors"
              style={{
                fontFamily: 'var(--font-barlow)',
                background: players === n ? '#21262d' : 'transparent',
                color: players === n ? '#e6edf3' : '#484f58',
                border: `1px solid ${players === n ? '#30363d' : 'transparent'}`,
              }}
            >
              {n} игр.
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
          {/* Column headers */}
          <div
            className="grid grid-cols-3 px-3 mb-1"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            <span className="text-[10px] uppercase tracking-widest text-[#484f58]">Фишка</span>
            <span className="text-[10px] uppercase tracking-widest text-[#484f58] text-center">На игрока</span>
            <span className="text-[10px] uppercase tracking-widest text-[#484f58] text-right">Стоимость</span>
          </div>

          {rows.map((row) => (
            <div
              key={row.denom}
              className="grid grid-cols-3 items-center px-3 py-2.5 rounded-lg"
              style={{ background: '#0d1117', border: '1px solid #21262d' }}
            >
              {/* Denomination with color dot */}
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: CHIP_COLORS[row.denom] }}
                />
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: CHIP_COLORS[row.denom], fontFamily: 'var(--font-space-mono)' }}
                >
                  {row.denom}
                </span>
              </div>

              {/* Per player */}
              <span
                className="text-sm font-bold text-[#e6edf3] tabular-nums text-center"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                {row.perPlayer}
              </span>

              {/* Value */}
              <span
                className="text-sm tabular-nums text-[#8b949e] text-right"
                style={{ fontFamily: 'var(--font-space-mono)' }}
              >
                {row.denom * row.perPlayer}
              </span>
            </div>
          ))}

          {/* Stack total */}
          <div
            className="flex items-center justify-between px-3 py-2 mt-1 rounded-lg"
            style={{ background: '#21262d', border: '1px solid #30363d' }}
          >
            <span
              className="text-[10px] uppercase tracking-widest text-[#8b949e]"
              style={{ fontFamily: 'var(--font-barlow)' }}
            >
              Стек
            </span>
            <span
              className="text-sm font-bold text-[#e6edf3] tabular-nums"
              style={{ fontFamily: 'var(--font-space-mono)' }}
            >
              {stackValue.toLocaleString('ru-RU')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Help Menu Button ────────────────────────────────────────────────────────

export function HelpMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<'hands' | 'chips' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const openModal = (which: 'hands' | 'chips') => {
    setMenuOpen(false)
    setModal(which)
  }

  return (
    <>
      {/* Button + popup */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95"
          style={{
            background: menuOpen ? '#21262d' : 'transparent',
            border: '1px solid #30363d',
            color: '#8b949e',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-barlow)',
          }}
          aria-label="Справка"
        >
          ?
        </button>

        {menuOpen && (
          <div
            className="absolute bottom-10 right-0 rounded-lg overflow-hidden z-40"
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <button
              onClick={() => openModal('hands')}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-[#21262d]"
              style={{ color: '#e6edf3', fontFamily: 'var(--font-barlow)' }}
            >
              Комбинации
            </button>
            <div style={{ height: 1, background: '#21262d' }} />
            <button
              onClick={() => openModal('chips')}
              className="w-full text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-[#21262d]"
              style={{ color: '#e6edf3', fontFamily: 'var(--font-barlow)' }}
            >
              Чип-каунт
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'hands' && <PokerHandsModal onClose={() => setModal(null)} />}
      {modal === 'chips' && <ChipCountModal onClose={() => setModal(null)} />}
    </>
  )
}
