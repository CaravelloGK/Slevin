'use client'

import { useEffect, useRef, useState } from 'react'
import type { BlindLevel, Tournament } from '@/types/tournament'
import { computeSecondsLeft, shouldAutoAdvance } from './blind-timer-logic'

interface UseBlindTimerOptions {
  onAutoAdvance?: () => void
}

interface UseBlindTimerReturn {
  secondsLeft: number
  isPaused: boolean
  progressPct: number // 0–100, how much of the level has elapsed
}

export function useBlindTimer(
  tournament: Tournament,
  currentLevel: BlindLevel | undefined,
  options: UseBlindTimerOptions = {},
): UseBlindTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvanceFiredRef = useRef(false)
  const { onAutoAdvance } = options

  const isPaused = tournament.status === 'paused'
  const isFinished = tournament.status === 'finished'
  const duration = (currentLevel?.duration_minutes ?? 0) * 60

  // Reset the auto-advance guard whenever the level changes
  useEffect(() => {
    autoAdvanceFiredRef.current = false
  }, [tournament.current_level])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (!currentLevel || !tournament.level_started_at || isFinished) {
      return
    }

    if (isPaused) {
      // Compute once so secondsLeft is correct when dealer clicks Resume
      setSecondsLeft(
        computeSecondsLeft(tournament.level_started_at, currentLevel.duration_minutes * 60),
      )
      return
    }

    const tick = () => {
      const remaining = computeSecondsLeft(
        tournament.level_started_at!,
        currentLevel.duration_minutes * 60,
      )
      setSecondsLeft(remaining)

      if (shouldAutoAdvance(remaining, tournament.status) && !autoAdvanceFiredRef.current) {
        autoAdvanceFiredRef.current = true
        onAutoAdvance?.()
      }
    }

    tick()

    // Align the interval to the exact second boundary derived from level_started_at.
    // Both dealer and spectator will tick at the same wall-clock instants,
    // eliminating the phase-drift that causes a persistent 1-second difference.
    const startedAtMs = new Date(tournament.level_started_at!).getTime()
    const msUntilNextBoundary = 1000 - ((Date.now() - startedAtMs) % 1000)
    timeoutRef.current = setTimeout(() => {
      tick()
      intervalRef.current = setInterval(tick, 1000)
    }, msUntilNextBoundary)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [tournament.level_started_at, tournament.status, tournament.current_level, currentLevel, isPaused, isFinished, onAutoAdvance])

  const progressPct = duration > 0 ? Math.round(((duration - secondsLeft) / duration) * 100) : 0

  return { secondsLeft, isPaused, progressPct }
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
