import { describe, it, expect, vi } from 'vitest'
import { replayOfflineQueue, type ReplayDeps } from '../replay-queue'
import type { QueuedMutation } from '../dispatch-mutation'

function makeMutation(id: string): QueuedMutation {
  return {
    id,
    action: 'recordKnockout',
    payload: {
      tournament_id: '550e8400-e29b-41d4-a716-446655440000',
      killer_id: '550e8400-e29b-41d4-a716-446655440001',
      victim_id: '550e8400-e29b-41d4-a716-446655440002',
    },
    enqueuedAt: Date.now(),
    attempts: 0,
  }
}

function makeDeps(overrides: Partial<ReplayDeps> = {}): ReplayDeps {
  return {
    getAllQueued: vi.fn().mockResolvedValue([]),
    removeFromQueue: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue({ ok: true }),
    isCancelled: () => false,
    ...overrides,
  }
}

describe('replayOfflineQueue', () => {
  it('returns synced:0 when queue is empty', async () => {
    const deps = makeDeps()
    const result = await replayOfflineQueue(deps)
    expect(result).toEqual({ synced: 0 })
    expect(deps.post).not.toHaveBeenCalled()
  })

  it('replays mutations in order and removes each on success', async () => {
    const m1 = makeMutation('m1')
    const m2 = makeMutation('m2')
    const deps = makeDeps({ getAllQueued: vi.fn().mockResolvedValue([m1, m2]) })

    const result = await replayOfflineQueue(deps)

    expect(result).toEqual({ synced: 2 })
    expect(deps.post).toHaveBeenNthCalledWith(1, m1)
    expect(deps.post).toHaveBeenNthCalledWith(2, m2)
    expect(deps.removeFromQueue).toHaveBeenCalledWith('m1')
    expect(deps.removeFromQueue).toHaveBeenCalledWith('m2')
  })

  it('stops on first failed post and does not remove the failed mutation', async () => {
    const m1 = makeMutation('m1')
    const m2 = makeMutation('m2')
    const deps = makeDeps({
      getAllQueued: vi.fn().mockResolvedValue([m1, m2]),
      post: vi.fn().mockResolvedValue({ ok: false }),
    })

    const result = await replayOfflineQueue(deps)

    expect(result).toEqual({ synced: 0 })
    expect(deps.post).toHaveBeenCalledTimes(1)
    expect(deps.removeFromQueue).not.toHaveBeenCalled()
  })

  it('stops on network error and returns synced count accumulated so far', async () => {
    const m1 = makeMutation('m1')
    const m2 = makeMutation('m2')
    const deps = makeDeps({
      getAllQueued: vi.fn().mockResolvedValue([m1, m2]),
      post: vi
        .fn()
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('network error')),
    })

    const result = await replayOfflineQueue(deps)

    expect(result).toEqual({ synced: 1 })
    expect(deps.removeFromQueue).toHaveBeenCalledWith('m1')
    expect(deps.removeFromQueue).not.toHaveBeenCalledWith('m2')
  })

  it('stops processing when cancelled mid-queue', async () => {
    const m1 = makeMutation('m1')
    const m2 = makeMutation('m2')
    let calls = 0
    const deps = makeDeps({
      getAllQueued: vi.fn().mockResolvedValue([m1, m2]),
      post: vi.fn().mockResolvedValue({ ok: true }),
      isCancelled: () => {
        calls++
        return calls > 1
      },
    })

    const result = await replayOfflineQueue(deps)

    expect(result.synced).toBe(1)
    expect(deps.post).toHaveBeenCalledTimes(1)
  })

  it('does not call removeFromQueue when post returns ok:false', async () => {
    const m1 = makeMutation('m1')
    const deps = makeDeps({
      getAllQueued: vi.fn().mockResolvedValue([m1]),
      post: vi.fn().mockResolvedValue({ ok: false }),
    })

    await replayOfflineQueue(deps)

    expect(deps.removeFromQueue).not.toHaveBeenCalled()
  })
})
