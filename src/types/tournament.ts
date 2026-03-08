import type { Database } from './database.types'

export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
export type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']

export type TournamentPlayer = Database['public']['Tables']['tournament_players']['Row']
export type TournamentPlayerInsert = Database['public']['Tables']['tournament_players']['Insert']
export type TournamentPlayerUpdate = Database['public']['Tables']['tournament_players']['Update']

export type Player = Database['public']['Tables']['players']['Row']
export type PlayerInsert = Database['public']['Tables']['players']['Insert']

export type BlindStructure = Database['public']['Tables']['blind_structures']['Row']
export type BlindLevel = Database['public']['Tables']['blind_levels']['Row']
export type BlindLevelInsert = Database['public']['Tables']['blind_levels']['Insert']

export type TournamentStatus = Tournament['status']
export type PlayerStatus = TournamentPlayer['status']

export interface TournamentPlayerWithProfile extends TournamentPlayer {
  player: Player
}

export interface TournamentWithStructure extends Tournament {
  blind_structure: BlindStructure & { blind_levels: BlindLevel[] }
}

export type UserRole = 'admin' | 'dealer' | 'player'

export interface PrizePlace {
  position: number
  percentage: number
}
