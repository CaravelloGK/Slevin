export interface PlayerStatusSnapshot {
  player_id: string
  status: string
}

/**
 * Returns true when exactly one player remains non-eliminated.
 * Used to trigger automatic tournament end after a knockout.
 */
export function shouldAutoEnd(players: PlayerStatusSnapshot[]): boolean {
  const activeCount = players.filter(
    (p) => p.status !== 'eliminated' && p.status !== 'winner',
  ).length
  return activeCount === 1
}

/**
 * Returns the player_id of the single remaining active player, or null.
 */
export function getWinnerId(players: PlayerStatusSnapshot[]): string | null {
  const active = players.filter(
    (p) => p.status !== 'eliminated' && p.status !== 'winner',
  )
  return active.length === 1 ? active[0].player_id : null
}
