'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

interface Props {
  tournamentId: string
}

export function TournamentLobbyRealtime({ tournamentId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase
      .channel(`lobby:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_players',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, router])

  return null
}
