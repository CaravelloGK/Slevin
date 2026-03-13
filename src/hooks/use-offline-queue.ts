'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { replayOfflineQueue } from '@/lib/offline/replay-queue'

interface QueuedMutation {
  id: string
  action: string
  payload: Record<string, unknown>
  enqueuedAt: number
  attempts: number
}

const DB_NAME = 'slevin-offline'
const STORE_NAME = 'mutation-queue'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAllQueued(): Promise<QueuedMutation[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as QueuedMutation[])
    req.onerror = () => reject(req.error)
  })
}

async function addToQueue(mutation: QueuedMutation): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(mutation)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

interface UseOfflineQueueReturn {
  pendingCount: number
  isOnline: boolean
  enqueue: (action: string, payload: Record<string, unknown>) => Promise<void>
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    getAllQueued()
      .then((q) => setPendingCount(q.length))
      .catch(() => setPendingCount(0))
  }, [isOnline])

  const enqueue = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const mutation: QueuedMutation = {
      id: crypto.randomUUID(),
      action,
      payload,
      enqueuedAt: Date.now(),
      attempts: 0,
    }
    await addToQueue(mutation)
    const all = await getAllQueued()
    setPendingCount(all.length)
  }, [])

  // Replay queue on reconnect — strictly sequential
  useEffect(() => {
    if (!isOnline) return

    let cancelled = false

    async function replay() {
      const { synced } = await replayOfflineQueue({
        getAllQueued,
        removeFromQueue,
        post: (mutation) =>
          fetch('/api/offline-replay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mutation),
          }),
        isCancelled: () => cancelled,
      })

      if (synced > 0) {
        toast.success(`Синхронизировано: ${synced} ${synced === 1 ? 'действие' : 'действия'}`)
      }

      const remaining = await getAllQueued()
      setPendingCount(remaining.length)
    }

    replay()

    return () => {
      cancelled = true
    }
  }, [isOnline])

  return { pendingCount, isOnline, enqueue }
}
