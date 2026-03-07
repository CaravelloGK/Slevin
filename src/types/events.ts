import type { Database } from './database.types'

export type EventSource = Database['public']['Tables']['tournament_logs']['Row']['source']

export type EventType =
  | 'player.eliminated'
  | 'player.rebuy'
  | 'player.bounty_adjusted'
  | 'timer.level_advanced'
  | 'timer.paused'
  | 'timer.resumed'
  | 'tournament.started'
  | 'tournament.finished'
  | 'voice.command_received'
  | 'voice.command_executed'
  | 'cv.hand_started'

export type TournamentLog = Database['public']['Tables']['tournament_logs']['Row']

export interface KnockoutEventData {
  killer_id: string
  victim_id: string
  bounty_transferred: number
  victim_final_bounty: number
}

export interface RebuyEventData {
  player_id: string
  bounty_added: number
  new_current_bounty: number
  rebuy_count: number
}

export interface BountyAdjustEventData {
  player_id: string
  old_bounty: number
  new_bounty: number
  reason: string
}

export interface TimerLevelEventData {
  from_level: number
  to_level: number
}

export interface VoiceCommandEventData {
  raw: string
  parsed: {
    action: string
    killer?: string
    victim?: string
    [key: string]: unknown
  }
}

export interface LogEntry {
  tournament_id: string
  event_type: EventType
  actor_player_id: string | null
  data_json: KnockoutEventData | RebuyEventData | BountyAdjustEventData | TimerLevelEventData | VoiceCommandEventData | Record<string, unknown>
  source: EventSource
}
