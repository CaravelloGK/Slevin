'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useBlindTimer } from '@/hooks/use-blind-timer'
import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { recordKnockout, recordRebuy, pauseTimer, resumeTimer, advanceLevel, endTournament } from '@/lib/actions/tournament'
import { HeaderStrip } from './header-strip'
import { ActionBar } from './action-bar'
import { PlayerCard } from './player-card'
import { KnockoutDialog } from './knockout-dialog'
import { RebuyDialog } from './rebuy-dialog'
import { EndTournamentDialog } from './end-tournament-dialog'
import { EditPlayerDialog } from './edit-player-dialog'
import { LevelUpDialog } from './level-up-dialog'
import type { BlindLevel, Tournament, TournamentPlayerWithProfile } from '@/types/tournament'

interface DealerPanelProps {
  initialTournament: Tournament
  initialPlayers: TournamentPlayerWithProfile[]
  blindLevels: BlindLevel[]
}

export function DealerPanel({
  initialTournament,
  initialPlayers,
  blindLevels: initialBlindLevels,
}: DealerPanelProps) {
  const [tournament, setTournament] = useState<Tournament>(initialTournament)
  const [players, setPlayers] = useState<TournamentPlayerWithProfile[]>(initialPlayers)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // Blind levels can be overridden per-tournament by the dealer
  const [localBlindLevels, setLocalBlindLevels] = useState<BlindLevel[]>(initialBlindLevels)

  const [knockoutVictim, setKnockoutVictim] = useState<TournamentPlayerWithProfile | null>(null)
  const [rebuyPlayer, setRebuyPlayer] = useState<TournamentPlayerWithProfile | null>(null)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [editPlayer, setEditPlayer] = useState<TournamentPlayerWithProfile | null>(null)
  const [levelUpPromptOpen, setLevelUpPromptOpen] = useState(false)

  const { pendingCount, isOnline, enqueue } = useOfflineQueue()

  // ---- Handlers ---------------------------------------------------------------

  const handleKnockout = useCallback(
    async (killerId: string, victimId: string) => {
      const action = 'recordKnockout'
      const payload = { tournament_id: tournament.id, killer_id: killerId, victim_id: victimId }

      if (!isOnline) {
        await enqueue(action, payload)
        setKnockoutVictim(null)
        return
      }

      const result = await recordKnockout(payload)
      if (!result.success) {
        toast.error(`Knockout error: ${result.error}`)
      }
      setKnockoutVictim(null)
    },
    [tournament.id, isOnline, enqueue],
  )

  const handleRebuy = useCallback(
    async (playerId: string) => {
      const action = 'recordRebuy'
      const payload = { tournament_id: tournament.id, player_id: playerId }

      if (!isOnline) {
        await enqueue(action, payload)
        setRebuyPlayer(null)
        return
      }

      const result = await recordRebuy(payload)
      if (!result.success) {
        toast.error(`Rebuy error: ${result.error}`)
      }
      setRebuyPlayer(null)
    },
    [tournament.id, isOnline, enqueue],
  )

  const handlePause = useCallback(
    async (sLeft: number) => {
      await pauseTimer({ tournament_id: tournament.id, seconds_remaining: sLeft })
    },
    [tournament.id],
  )

  const handleResume = useCallback(
    async (sLeft: number) => {
      await resumeTimer({ tournament_id: tournament.id, seconds_remaining: sLeft })
    },
    [tournament.id],
  )

  const handlePrevLevel = useCallback(async () => {
    await advanceLevel({ tournament_id: tournament.id, direction: 'prev' })
  }, [tournament.id])

  const handleNextLevel = useCallback(async () => {
    await advanceLevel({ tournament_id: tournament.id, direction: 'next' })
  }, [tournament.id])

  // Called by the timer hook when it hits 00:00 — shows a prompt instead of auto-advancing
  const handleTimerExpired = useCallback(() => {
    setLevelUpPromptOpen(true)
  }, [])

  const handleEndTournament = useCallback(async () => {
    const result = await endTournament({ tournament_id: tournament.id })
    if (!result.success) {
      toast.error(`Ошибка завершения: ${result.error}`)
    }
    setEndConfirmOpen(false)
  }, [tournament.id])

  // ---- Hooks ------------------------------------------------------------------

  const currentLevel = localBlindLevels.find((l) => l.level_number === tournament.current_level)
  const nextLevel = localBlindLevels.find((l) => l.level_number === tournament.current_level + 1)

  const { secondsLeft, isPaused } = useBlindTimer(tournament, currentLevel, {
    onAutoAdvance: handleTimerExpired,
  })

  // Realtime subscription
  useTournamentRealtime({
    tournamentId: tournament.id,
    onPlayersChange: setPlayers,
    onTournamentChange: setTournament,
    onConnectionChange: setRealtimeConnected,
  })

  const activePlayers = players.filter((p) => p.status === 'active').length

  // ---- Render -----------------------------------------------------------------

  // Sort: active first (by seat), eliminated last
  const sortedPlayers = [...players].sort((a, b) => {
    const aOut = a.status === 'eliminated' ? 1 : 0
    const bOut = b.status === 'eliminated' ? 1 : 0
    if (aOut !== bOut) return aOut - bOut
    return (a.seat_number ?? 99) - (b.seat_number ?? 99)
  })

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        width: '100vw',
        background: '#0d1117',
        fontFamily: 'var(--font-barlow), system-ui, sans-serif',
      }}
    >
      <HeaderStrip
        tournament={tournament}
        currentLevel={currentLevel}
        nextLevel={nextLevel}
        connected={realtimeConnected}
        pendingCount={pendingCount}
        isOnline={isOnline}
        players={players}
      />

      {/* Finished banner */}
      {tournament.status === 'finished' && (
        <div
          className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ background: '#1a1a0a', borderBottom: '1px solid #3d2e00' }}
        >
          <span
            className="text-sm font-bold tracking-[0.1em] text-[#d4af37] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            Турнир завершён
          </span>
          <a
            href={`/club/${tournament.id}`}
            className="px-4 py-1.5 rounded text-xs font-bold tracking-widest uppercase transition-all duration-150"
            style={{
              background: '#3d2e00',
              color: '#d4af37',
              border: '1px solid #d4af37',
              fontFamily: 'var(--font-barlow)',
            }}
          >
            Статистика →
          </a>
        </div>
      )}

      {/* Player grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="grid gap-3 h-full"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            alignContent: 'start',
          }}
        >
          {sortedPlayers.map((entry) => (
            <PlayerCard
              key={entry.id}
              entry={entry}
              entryFee={tournament.entry_fee}
              bountyAmount={tournament.bounty_amount}
              tournamentFinished={tournament.status === 'finished'}
              onKnockout={setKnockoutVictim}
              onRebuy={setRebuyPlayer}
              onEdit={setEditPlayer}
            />
          ))}
        </div>
      </div>

      <ActionBar
        tournamentId={tournament.id}
        isPaused={isPaused}
        activePlayers={activePlayers}
        totalPlayers={players.length}
        currentLevel={tournament.current_level}
        secondsLeft={secondsLeft}
        onPause={handlePause}
        onResume={handleResume}
        onPrevLevel={handlePrevLevel}
        onNextLevel={handleNextLevel}
        onEndTournament={() => setEndConfirmOpen(true)}
      />

      {/* Modals */}
      {knockoutVictim && (
        <KnockoutDialog
          victim={knockoutVictim}
          allPlayers={players}
          bountyAmount={tournament.bounty_amount}
          entryFee={tournament.entry_fee}
          onConfirm={handleKnockout}
          onCancel={() => setKnockoutVictim(null)}
        />
      )}

      {rebuyPlayer && (
        <RebuyDialog
          player={rebuyPlayer}
          bountyAmount={tournament.bounty_amount}
          onConfirm={handleRebuy}
          onCancel={() => setRebuyPlayer(null)}
        />
      )}

      {endConfirmOpen && (
        <EndTournamentDialog
          onConfirm={handleEndTournament}
          onCancel={() => setEndConfirmOpen(false)}
        />
      )}

      {levelUpPromptOpen && (
        <LevelUpDialog
          currentLevel={tournament.current_level}
          nextLevel={nextLevel}
          onConfirm={async () => {
            setLevelUpPromptOpen(false)
            await handleNextLevel()
          }}
          onCancel={() => setLevelUpPromptOpen(false)}
        />
      )}

      {editPlayer && (
        <EditPlayerDialog
          player={editPlayer}
          tournament={tournament}
          blindLevels={localBlindLevels}
          onClose={() => setEditPlayer(null)}
          onBlindLevelsChange={setLocalBlindLevels}
        />
      )}
    </div>
  )
}
