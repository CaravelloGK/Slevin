'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registerForTournament(
  tournamentId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Не авторизован' }

  // Find player row linked to this auth user
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!player) return { success: false, error: 'Профиль игрока не найден' }

  // Check tournament status
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, status, bounty_amount')
    .eq('id', tournamentId)
    .single()

  if (!tournament) return { success: false, error: 'Турнир не найден' }
  if (tournament.status !== 'pending') return { success: false, error: 'Регистрация закрыта' }

  // Check if already registered
  const { data: existing } = await supabase
    .from('tournament_players')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', player.id)
    .single()

  if (existing) return { success: false, error: 'Вы уже зарегистрированы' }

  const { error } = await supabase.from('tournament_players').insert({
    tournament_id: tournamentId,
    player_id: player.id,
    current_bounty: tournament.bounty_amount,
  })

  if (error) return { success: false, error: 'Ошибка регистрации' }

  revalidatePath(`/tournament/${tournamentId}`)
  return { success: true }
}
