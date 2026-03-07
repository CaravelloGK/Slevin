// Shared types for Supabase Edge Functions

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export interface TournamentPlayer {
  id: string
  tournament_id: string
  player_id: string
  current_bounty: number
  guaranteed_bounty: number
  rebuys: number
  is_active: boolean
  finish_position: number | null
  registered_at: string
}

export interface Tournament {
  id: string
  bounty_amount: number
  status: 'pending' | 'running' | 'paused' | 'finished'
  current_level: number
  level_started_at: string | null
}

export interface KnockoutRequest {
  tournament_id: string
  killer_id: string
  victim_id: string
}

export interface KnockoutResult {
  killer: Pick<TournamentPlayer, 'player_id' | 'current_bounty' | 'guaranteed_bounty'>
  victim: Pick<TournamentPlayer, 'player_id' | 'current_bounty' | 'is_active' | 'finish_position'>
  bounty_transferred: number
  log_id: string
}

export interface RebuyRequest {
  tournament_id: string
  player_id: string
}

export interface RebuyResult {
  player: Pick<TournamentPlayer, 'player_id' | 'current_bounty' | 'rebuys' | 'is_active'>
  bounty_added: number
  log_id: string
}

export interface AdjustRequest {
  tournament_id: string
  player_id: string
  delta: number
  reason: string
}

export interface AdjustResult {
  player: Pick<TournamentPlayer, 'player_id' | 'current_bounty'>
  delta: number
  new_bounty: number
  log_id: string
}
