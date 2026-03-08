import { describe, it, expect } from 'vitest'
import { computeSecondsLeft, shouldAutoAdvance } from '../blind-timer-logic'

describe('computeSecondsLeft', () => {
  it('returns full duration when level just started', () => {
    const now = Date.now()
    const levelStartedAt = new Date(now).toISOString()
    expect(computeSecondsLeft(levelStartedAt, 900, now)).toBe(900)
  })

  it('returns reduced time after some seconds have elapsed', () => {
    const now = Date.now()
    const levelStartedAt = new Date(now - 60_000).toISOString() // 60s ago
    expect(computeSecondsLeft(levelStartedAt, 900, now)).toBe(840)
  })

  it('returns 0 when level time has fully elapsed', () => {
    const now = Date.now()
    const levelStartedAt = new Date(now - 900_000).toISOString() // 900s ago
    expect(computeSecondsLeft(levelStartedAt, 900, now)).toBe(0)
  })

  it('never returns a negative number when level is overdue', () => {
    const now = Date.now()
    const levelStartedAt = new Date(now - 1200_000).toISOString() // 1200s ago
    expect(computeSecondsLeft(levelStartedAt, 900, now)).toBe(0)
  })

  it('handles sub-second precision by flooring elapsed time', () => {
    const now = Date.now()
    const levelStartedAt = new Date(now - 59_500).toISOString() // 59.5s ago
    expect(computeSecondsLeft(levelStartedAt, 900, now)).toBe(841) // floor(59.5) = 59, 900 - 59 = 841
  })
})

describe('shouldAutoAdvance', () => {
  it('returns true when secondsLeft is 0 and tournament is running', () => {
    expect(shouldAutoAdvance(0, 'running')).toBe(true)
  })

  it('returns false when secondsLeft is greater than 0', () => {
    expect(shouldAutoAdvance(1, 'running')).toBe(false)
    expect(shouldAutoAdvance(60, 'running')).toBe(false)
  })

  it('returns false when tournament is paused even if secondsLeft is 0', () => {
    expect(shouldAutoAdvance(0, 'paused')).toBe(false)
  })

  it('returns false when tournament is pending', () => {
    expect(shouldAutoAdvance(0, 'pending')).toBe(false)
  })

  it('returns false when tournament is finished', () => {
    expect(shouldAutoAdvance(0, 'finished')).toBe(false)
  })
})
