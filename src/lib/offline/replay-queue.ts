import type { QueuedMutation } from './dispatch-mutation'

export interface ReplayDeps {
  getAllQueued: () => Promise<QueuedMutation[]>
  removeFromQueue: (id: string) => Promise<void>
  post: (mutation: QueuedMutation) => Promise<{ ok: boolean }>
  isCancelled: () => boolean
}

export interface ReplayResult {
  synced: number
}

/**
 * Replays the offline queue sequentially.
 * Stops on first network error or non-ok response (queue stays intact for next reconnect).
 */
export async function replayOfflineQueue(deps: ReplayDeps): Promise<ReplayResult> {
  const queue = await deps.getAllQueued()
  let synced = 0

  for (const mutation of queue) {
    if (deps.isCancelled()) break
    try {
      const res = await deps.post(mutation)
      if (res.ok) {
        await deps.removeFromQueue(mutation.id)
        synced++
      } else {
        break
      }
    } catch {
      break
    }
  }

  return { synced }
}
