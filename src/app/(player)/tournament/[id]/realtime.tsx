'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

interface Props {
  tournamentId: string
  role?: string
}

export function TournamentLobbyRealtime({ tournamentId, role }: Props) {
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status
          if (newStatus === 'running' || newStatus === 'paused') {
            if (role === 'dealer') {
              router.push(`/tournament/${tournamentId}/dealer`)
            } else {
              router.push(`/tournament/${tournamentId}/live`)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournamentId, role, router])

  return null
}
