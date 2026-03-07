'use client'

import { useEffect, useRef, useState } from 'react'
import type { BlindLevel, Tournament } from '@/types/tournament'

interface UseBlindTimerReturn {
  secondsLeft: number
  isPaused: boolean
  progressPct: number // 0–100, how much of the level has elapsed
}

export function useBlindTimer(
  tournament: Tournament,
  currentLevel: BlindLevel | undefined,
): UseBlindTimerReturn {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isPaused = tournament.status === 'paused'
  const duration = currentLevel?.duration_seconds ?? 0

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (!currentLevel || !tournament.level_started_at || isPaused) {
      // When paused, keep showing current secondsLeft without decrementing
      return
    }

    const tick = () => {
      const startedAt = new Date(tournament.level_started_at!).getTime()
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(0, currentLevel.duration_seconds - elapsed)
      setSecondsLeft(remaining)
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [tournament.level_started_at, tournament.status, currentLevel, isPaused])

  const progressPct = duration > 0 ? Math.round(((duration - secondsLeft) / duration) * 100) : 0

  return { secondsLeft, isPaused, progressPct }
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
