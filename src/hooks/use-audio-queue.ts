'use client'

import { useRef, useCallback } from 'react'
import { AudioQueue } from '@/lib/audio/queue'

export function useAudioQueue() {
  const queueRef = useRef<AudioQueue | null>(null)

  function getQueue(): AudioQueue | null {
    if (typeof window === 'undefined') return null
    if (!queueRef.current) {
      queueRef.current = new AudioQueue()
    }
    return queueRef.current
  }

  const enqueue = useCallback((fileName: string) => {
    getQueue()?.enqueue(fileName)
  }, [])

  const clear = useCallback(() => {
    getQueue()?.clear()
  }, [])

  const whenEmpty = useCallback((): Promise<void> => {
    return getQueue()?.whenEmpty() ?? Promise.resolve()
  }, [])

  return { enqueue, clear, whenEmpty }
}
