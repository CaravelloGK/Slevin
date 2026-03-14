'use client'

import { useState, useRef, useEffect } from 'react'

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
          width: 'min(92vw, 500px)',
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
              раздача фишек по игрокам
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Placeholder */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="text-center">
            <div
              className="text-4xl mb-4"
              style={{ color: '#30363d' }}
            >
              ◈
            </div>
            <p className="text-sm text-[#484f58]" style={{ fontFamily: 'var(--font-barlow)' }}>
              Информация о раздаче фишек появится здесь
            </p>
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
