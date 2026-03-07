// Business logic for bounty/knockout Edge Function
// Separated from HTTP handler for testability

import type {
  KnockoutRequest,
  KnockoutResult,
  ApiResponse,
} from '../../_shared/types.ts'

export interface SupabaseClientLike {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
  from: (table: string) => QueryBuilder
}

export interface QueryBuilder {
  select: (columns: string) => QueryBuilder
  eq: (column: string, value: unknown) => QueryBuilder
  single: () => Promise<{ data: unknown; error: unknown }>
  insert: (row: unknown) => Promise<{ data: unknown; error: unknown }>
  update: (values: unknown) => QueryBuilder
}

export interface KnockoutDeps {
  supabase: SupabaseClientLike
  actorPlayerId: string
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function calculateBountyTransfer(currentBounty: number): {
  half: number
  remainder: number
} {
  const half = Math.floor(currentBounty * 0.5)
  const remainder = currentBounty - half * 2
  return { half, remainder }
}

export function validateKnockoutRequest(body: unknown): KnockoutRequest | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null

  const b = body as Record<string, unknown>

  if (
    typeof b.tournament_id !== 'string' ||
    typeof b.killer_id !== 'string' ||
    typeof b.victim_id !== 'string'
  ) return null

  if (!b.tournament_id || !b.killer_id || !b.victim_id) return null

  if (b.killer_id === b.victim_id) return null

  return {
    tournament_id: b.tournament_id,
    killer_id: b.killer_id,
    victim_id: b.victim_id,
  }
}

// ---------------------------------------------------------------------------
// Core business logic
// Delegates to a single Postgres RPC that runs everything in one transaction.
// The RPC is responsible for:
//   1. Fetching victim + killer tournament_players
//   2. Computing and applying bounty transfer
//   3. Deactivating victim and setting finish_position
//   4. Inserting a tournament_logs row
//   5. Returning the updated state + log id
// ---------------------------------------------------------------------------

interface RpcResult {
  killer_guaranteed_bounty: number
  killer_current_bounty: number
  victim_finish_position: number
  bounty_transferred: number
  log_id: string
}

export async function processKnockout(
  req: KnockoutRequest,
  deps: KnockoutDeps,
): Promise<ApiResponse<KnockoutResult>> {
  const { data, error } = await deps.supabase.rpc('process_knockout', {
    p_tournament_id: req.tournament_id,
    p_killer_id: req.killer_id,
    p_victim_id: req.victim_id,
    p_actor_id: deps.actorPlayerId,
  })

  if (error) {
    return {
      success: false,
      error: 'Knockout failed',
      code: 'DB_ERROR',
    }
  }

  const result = data as RpcResult

  return {
    success: true,
    data: {
      killer: {
        player_id: req.killer_id,
        current_bounty: result.killer_current_bounty,
        guaranteed_bounty: result.killer_guaranteed_bounty,
      },
      victim: {
        player_id: req.victim_id,
        current_bounty: 0,
        is_active: false,
        finish_position: result.victim_finish_position,
      },
      bounty_transferred: result.bounty_transferred,
      log_id: result.log_id,
    },
  }
}
