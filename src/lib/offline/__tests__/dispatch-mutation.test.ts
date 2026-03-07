import { describe, it, expect, vi } from 'vitest'
import { dispatchMutation, type ActionMap, type QueuedMutation } from '../dispatch-mutation'

const TOURNAMENT_ID = '550e8400-e29b-41d4-a716-446655440000'
const KILLER_ID = '550e8400-e29b-41d4-a716-446655440001'
const VICTIM_ID = '550e8400-e29b-41d4-a716-446655440002'
const PLAYER_ID = '550e8400-e29b-41d4-a716-446655440003'

function makeMutation(overrides: Partial<QueuedMutation> = {}): QueuedMutation {
  return {
    id: 'test-id',
    action: 'recordKnockout',
    payload: {
      tournament_id: TOURNAMENT_ID,
      killer_id: KILLER_ID,
      victim_id: VICTIM_ID,
    },
    enqueuedAt: Date.now(),
    attempts: 0,
    ...overrides,
  }
}

function makeActions(overrides: Partial<ActionMap> = {}): ActionMap {
  return {
    recordKnockout: vi.fn().mockResolvedValue({ success: true, data: {} }),
    recordRebuy: vi.fn().mockResolvedValue({ success: true, data: {} }),
    ...overrides,
  }
}

describe('dispatchMutation', () => {
  describe('recordKnockout', () => {
    it('calls recordKnockout with validated payload and returns ok:true on success', async () => {
      const actions = makeActions()
      const mutation = makeMutation({
        action: 'recordKnockout',
        payload: { tournament_id: TOURNAMENT_ID, killer_id: KILLER_ID, victim_id: VICTIM_ID },
      })

      const result = await dispatchMutation(mutation, actions)

      expect(result).toEqual({ ok: true })
      expect(actions.recordKnockout).toHaveBeenCalledWith({
        tournament_id: TOURNAMENT_ID,
        killer_id: KILLER_ID,
        victim_id: VICTIM_ID,
      })
    })

    it('returns ok:false with server error when action fails', async () => {
      const actions = makeActions({
        recordKnockout: vi.fn().mockResolvedValue({ success: false, error: 'Player not found' }),
      })
      const mutation = makeMutation({ action: 'recordKnockout' })

      const result = await dispatchMutation(mutation, actions)

      expect(result).toEqual({ ok: false, error: 'Player not found' })
    })

    it('returns ok:false with invalid_payload when knockout payload is missing fields', async () => {
      const actions = makeActions()
      const mutation = makeMutation({
        action: 'recordKnockout',
        payload: { tournament_id: TOURNAMENT_ID }, // missing killer_id and victim_id
      })

      const result = await dispatchMutation(mutation, actions)

      expect(result.ok).toBe(false)
      expect((result as { ok: false; error: string }).error).toBe('invalid_payload')
      expect(actions.recordKnockout).not.toHaveBeenCalled()
    })
  })

  describe('recordRebuy', () => {
    it('calls recordRebuy with validated payload and returns ok:true on success', async () => {
      const actions = makeActions()
      const mutation = makeMutation({
        action: 'recordRebuy',
        payload: { tournament_id: TOURNAMENT_ID, player_id: PLAYER_ID },
      })

      const result = await dispatchMutation(mutation, actions)

      expect(result).toEqual({ ok: true })
      expect(actions.recordRebuy).toHaveBeenCalledWith({
        tournament_id: TOURNAMENT_ID,
        player_id: PLAYER_ID,
      })
    })

    it('returns ok:false with server error when rebuy fails', async () => {
      const actions = makeActions({
        recordRebuy: vi.fn().mockResolvedValue({ success: false, error: 'Tournament not running' }),
      })
      const mutation = makeMutation({
        action: 'recordRebuy',
        payload: { tournament_id: TOURNAMENT_ID, player_id: PLAYER_ID },
      })

      const result = await dispatchMutation(mutation, actions)

      expect(result).toEqual({ ok: false, error: 'Tournament not running' })
    })

    it('returns ok:false with invalid_payload when rebuy payload is incomplete', async () => {
      const actions = makeActions()
      const mutation = makeMutation({
        action: 'recordRebuy',
        payload: { tournament_id: TOURNAMENT_ID }, // missing player_id
      })

      const result = await dispatchMutation(mutation, actions)

      expect(result.ok).toBe(false)
      expect((result as { ok: false; error: string }).error).toBe('invalid_payload')
      expect(actions.recordRebuy).not.toHaveBeenCalled()
    })
  })

  describe('unknown action', () => {
    it('returns ok:false with unknown_action for unrecognised action strings', async () => {
      const actions = makeActions()
      const mutation = makeMutation({ action: 'deleteEverything' })

      const result = await dispatchMutation(mutation, actions)

      expect(result).toEqual({ ok: false, error: 'unknown_action' })
      expect(actions.recordKnockout).not.toHaveBeenCalled()
      expect(actions.recordRebuy).not.toHaveBeenCalled()
    })
  })
})
