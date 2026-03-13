'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useAudioMute(tournamentId: string) {
  const [isMuted, setIsMuted] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel(`tournament:${tournamentId}:audio`)
      .on('broadcast', { event: 'mute_toggle' }, ({ payload }) => {
        setIsMuted(payload.muted as boolean)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tournamentId])

  const broadcastMute = useCallback(
    async (muted: boolean) => {
      setIsMuted(muted)
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'mute_toggle',
        payload: { muted },
      })
    },
    [],
  )

  const toggleMute = useCallback(() => {
    void broadcastMute(!isMuted)
  }, [isMuted, broadcastMute])

  return { isMuted, toggleMute }
}
