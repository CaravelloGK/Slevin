'use client'

import { useState, useCallback } from 'react'
import { useBlindTimer } from '@/hooks/use-blind-timer'
import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { recordKnockout, recordRebuy, pauseTimer, resumeTimer, advanceLevel } from '@/lib/actions/tournament'
import { HeaderStrip } from './header-strip'
import { ActionBar } from './action-bar'
import { PlayerCard } from './player-card'
import { KnockoutDialog } from './knockout-dialog'
import { RebuyDialog } from './rebuy-dialog'
import type { BlindLevel, Tournament, TournamentPlayerWithProfile } from '@/types/tournament'

interface DealerPanelProps {
  initialTournament: Tournament
  initialPlayers: TournamentPlayerWithProfile[]
  blindLevels: BlindLevel[]
}

export function DealerPanel({
  initialTournament,
  initialPlayers,
  blindLevels,
}: DealerPanelProps) {
  const [tournament, setTournament] = useState<Tournament>(initialTournament)
  const [players, setPlayers] = useState<TournamentPlayerWithProfile[]>(initialPlayers)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  const [knockoutVictim, setKnockoutVictim] = useState<TournamentPlayerWithProfile | null>(null)
  const [rebuyPlayer, setRebuyPlayer] = useState<TournamentPlayerWithProfile | null>(null)

  const { pendingCount, isOnline, enqueue } = useOfflineQueue()

  const currentLevel = blindLevels.find((l) => l.level === tournament.current_level)
  const nextLevel = blindLevels.find((l) => l.level === tournament.current_level + 1)

  const { secondsLeft, isPaused } = useBlindTimer(tournament, currentLevel)

  // Realtime subscription
  useTournamentRealtime({
    tournamentId: tournament.id,
    onPlayersChange: setPlayers,
    onTournamentChange: setTournament,
    onConnectionChange: setRealtimeConnected,
  })

  const activePlayers = players.filter((p) => p.status !== 'eliminated').length

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
        console.error('Knockout failed:', result.error)
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
        console.error('Rebuy failed:', result.error)
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
      />

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
              onKnockout={setKnockoutVictim}
              onRebuy={setRebuyPlayer}
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
      />

      {/* Modals */}
      {knockoutVictim && (
        <KnockoutDialog
          victim={knockoutVictim}
          allPlayers={players}
          bountyAmount={tournament.bounty_amount}
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
    </div>
  )
}
