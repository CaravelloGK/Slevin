'use client'

import { useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Tournament, TournamentPlayerWithProfile } from '@/types/tournament'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseTournamentRealtimeOptions {
  tournamentId: string
  onPlayersChange: (updater: (prev: TournamentPlayerWithProfile[]) => TournamentPlayerWithProfile[]) => void
  onTournamentChange: (updater: (prev: Tournament) => Tournament) => void
  onConnectionChange: (connected: boolean) => void
}

export function useTournamentRealtime({
  tournamentId,
  onPlayersChange,
  onTournamentChange,
  onConnectionChange,
}: UseTournamentRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel(`dealer:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_players',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            onPlayersChange((prev) =>
              prev.map((p) =>
                p.id === (payload.new as { id: string }).id
                  ? { ...p, ...(payload.new as TournamentPlayerWithProfile) }
                  : p,
              ),
            )
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          onTournamentChange((prev) => ({ ...prev, ...(payload.new as Tournament) }))
        },
      )
      .subscribe((status) => {
        onConnectionChange(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
