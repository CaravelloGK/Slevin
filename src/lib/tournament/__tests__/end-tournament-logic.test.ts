import { describe, it, expect } from 'vitest'
import { shouldAutoEnd, getWinnerId } from '../end-tournament-logic'

describe('shouldAutoEnd', () => {
  it('returns true when exactly 1 active player remains', () => {
    const players = [
      { player_id: 'p1', status: 'active' },
      { player_id: 'p2', status: 'eliminated' },
      { player_id: 'p3', status: 'eliminated' },
    ]
    expect(shouldAutoEnd(players)).toBe(true)
  })

  it('returns true when 1 rebought player and rest eliminated', () => {
    const players = [
      { player_id: 'p1', status: 'rebought' },
      { player_id: 'p2', status: 'eliminated' },
    ]
    expect(shouldAutoEnd(players)).toBe(true)
  })

  it('returns false when 2 active players remain', () => {
    const players = [
      { player_id: 'p1', status: 'active' },
      { player_id: 'p2', status: 'active' },
      { player_id: 'p3', status: 'eliminated' },
    ]
    expect(shouldAutoEnd(players)).toBe(false)
  })

  it('returns false when 1 active + 1 rebought remain', () => {
    const players = [
      { player_id: 'p1', status: 'active' },
      { player_id: 'p2', status: 'rebought' },
      { player_id: 'p3', status: 'eliminated' },
    ]
    expect(shouldAutoEnd(players)).toBe(false)
  })

  it('returns false when 0 active players (degenerate case)', () => {
    const players = [
      { player_id: 'p1', status: 'eliminated' },
      { player_id: 'p2', status: 'eliminated' },
    ]
    expect(shouldAutoEnd(players)).toBe(false)
  })

  it('returns false when player is already marked winner', () => {
    const players = [
      { player_id: 'p1', status: 'winner' },
      { player_id: 'p2', status: 'eliminated' },
    ]
    expect(shouldAutoEnd(players)).toBe(false)
  })

  it('returns false with empty player list', () => {
    expect(shouldAutoEnd([])).toBe(false)
  })
})

describe('getWinnerId', () => {
  it('returns player_id when exactly 1 non-eliminated player', () => {
    const players = [
      { player_id: 'p1', status: 'active' },
      { player_id: 'p2', status: 'eliminated' },
    ]
    expect(getWinnerId(players)).toBe('p1')
  })

  it('returns player_id for rebought winner', () => {
    const players = [
      { player_id: 'p1', status: 'rebought' },
      { player_id: 'p2', status: 'eliminated' },
    ]
    expect(getWinnerId(players)).toBe('p1')
  })

  it('returns null when 2 active players remain', () => {
    const players = [
      { player_id: 'p1', status: 'active' },
      { player_id: 'p2', status: 'active' },
    ]
    expect(getWinnerId(players)).toBeNull()
  })

  it('returns null when 0 active players', () => {
    const players = [
      { player_id: 'p1', status: 'eliminated' },
    ]
    expect(getWinnerId(players)).toBeNull()
  })

  it('returns null for empty list', () => {
    expect(getWinnerId([])).toBeNull()
  })
})
