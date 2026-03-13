'use client'

import { useEffect, useRef } from 'react'
import { AUDIO } from '@/lib/audio/manifest'
import type { BlindLevel } from '@/types/tournament'

const TIME_TO_EAT_MS = 2.5 * 60 * 60 * 1000 // 2h30m in milliseconds

interface UseAnnouncementsProps {
  secondsLeft: number
  currentLevel: BlindLevel | undefined
  activePlayers: number
  tournamentStartedAt: string | null
  isRunning: boolean
  isMuted: boolean
  enqueue: (fileName: string) => void
}

export function useAnnouncements({
  secondsLeft,
  currentLevel,
  activePlayers,
  tournamentStartedAt,
  isRunning,
  isMuted,
  enqueue,
}: UseAnnouncementsProps) {
  // Refs for always-fresh values inside effects
  const isMutedRef = useRef(isMuted)
  isMutedRef.current = isMuted
  const isRunningRef = useRef(isRunning)
  isRunningRef.current = isRunning
  const enqueueRef = useRef(enqueue)
  enqueueRef.current = enqueue

  const twentyMinFiredRef = useRef(false)
  const fiveMinFiredRef = useRef(false)
  const oneMinFiredRef = useRef(false)
  const finalTableFiredRef = useRef(false)

  // Reset per-level timer guards when level changes
  useEffect(() => {
    twentyMinFiredRef.current = false
    fiveMinFiredRef.current = false
    oneMinFiredRef.current = false
  }, [currentLevel?.level_number])

  // Timer-based triggers: 5 min, 1 min, beep countdown
  useEffect(() => {
    if (isMutedRef.current || !isRunningRef.current) return

    if (secondsLeft === 1200 && !twentyMinFiredRef.current) {
      twentyMinFiredRef.current = true
      enqueueRef.current(AUDIO.TWENTY_MINUTES)
    }

    if (secondsLeft === 300 && !fiveMinFiredRef.current) {
      fiveMinFiredRef.current = true
      enqueueRef.current(AUDIO.FIVE_MINUTES)
    }

    if (secondsLeft === 60 && !oneMinFiredRef.current) {
      oneMinFiredRef.current = true
      enqueueRef.current(AUDIO.ONE_MINUTE)
    }

    // Beep each second 5,4,3,2 — then a final beep on second 1
    if (secondsLeft >= 2 && secondsLeft <= 5) {
      enqueueRef.current(AUDIO.BEEP)
    }

    if (secondsLeft === 1) {
      enqueueRef.current(AUDIO.BEEP_FINAL)
    }
  }, [secondsLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  // Final table: fires once when exactly 3 active players remain
  useEffect(() => {
    if (isMutedRef.current || !isRunningRef.current) return

    if (activePlayers === 3 && !finalTableFiredRef.current) {
      finalTableFiredRef.current = true
      enqueueRef.current(AUDIO.FINAL_TABLE)
    }
  }, [activePlayers]) // eslint-disable-line react-hooks/exhaustive-deps

  // Time to eat: fires once 2h30m after tournament.started_at (wall-clock)
  useEffect(() => {
    if (!tournamentStartedAt) return

    const startMs = new Date(tournamentStartedAt).getTime()
    const delay = startMs + TIME_TO_EAT_MS - Date.now()

    if (delay <= 0) return // Already past the mark

    const timeout = setTimeout(() => {
      if (!isMutedRef.current) {
        enqueueRef.current(AUDIO.TIME_TO_EAT)
      }
    }, delay)

    return () => clearTimeout(timeout)
  }, [tournamentStartedAt]) // eslint-disable-line react-hooks/exhaustive-deps
}
