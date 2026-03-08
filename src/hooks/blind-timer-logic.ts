import type { TournamentStatus } from '@/types/tournament'

/**
 * Computes the number of seconds remaining in the current blind level.
 * Pure function — no side effects, injectable `now` for testability.
 */
export function computeSecondsLeft(
  levelStartedAt: string,
  durationSeconds: number,
  now = Date.now(),
): number {
  const startedAtMs = new Date(levelStartedAt).getTime()
  const elapsed = Math.floor((now - startedAtMs) / 1000)
  return Math.max(0, durationSeconds - elapsed)
}

/**
 * Returns true when the timer should fire an automatic level advance.
 * Only triggers when the tournament is actively running and time has expired.
 */
export function shouldAutoAdvance(secondsLeft: number, status: TournamentStatus): boolean {
  return secondsLeft === 0 && status === 'running'
}
