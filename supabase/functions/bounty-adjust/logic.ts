// Business logic for bounty/adjust Edge Function

import type {
  AdjustRequest,
  AdjustResult,
  ApiResponse,
} from '../_shared/types.ts'

export interface SupabaseClientLike {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}

export interface AdjustDeps {
  supabase: SupabaseClientLike
  actorPlayerId: string
}

interface RpcResult {
  new_bounty: number
  delta: number
  log_id: string
}

interface RpcError {
  message: string
  code?: string
}

export function validateAdjustRequest(body: unknown): AdjustRequest | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null

  const b = body as Record<string, unknown>

  if (typeof b.tournament_id !== 'string' || !b.tournament_id) return null
  if (typeof b.player_id !== 'string' || !b.player_id) return null
  if (typeof b.delta !== 'number') return null
  if (!Number.isInteger(b.delta) || b.delta === 0) return null
  if (typeof b.reason !== 'string' || !b.reason) return null

  return {
    tournament_id: b.tournament_id,
    player_id:     b.player_id,
    delta:         b.delta,
    reason:        b.reason,
  }
}

export async function processAdjust(
  req: AdjustRequest,
  deps: AdjustDeps,
): Promise<ApiResponse<AdjustResult>> {
  const { data, error } = await deps.supabase.rpc('process_bounty_adjust', {
    p_tournament_id: req.tournament_id,
    p_player_id:     req.player_id,
    p_delta:         req.delta,
    p_reason:        req.reason,
    p_actor_id:      deps.actorPlayerId,
  })

  if (error) {
    const rpcError = error as RpcError
    const isBelowZero = rpcError.message === 'bounty_below_zero' || rpcError.code === 'P0002'
    return {
      success: false,
      error:   isBelowZero ? 'Adjustment would make bounty negative' : 'Adjustment failed',
      code:    isBelowZero ? 'BOUNTY_BELOW_ZERO' : 'DB_ERROR',
    }
  }

  const result = data as RpcResult

  return {
    success: true,
    data: {
      player: {
        player_id:      req.player_id,
        current_bounty: result.new_bounty,
      },
      delta:      result.delta,
      new_bounty: result.new_bounty,
      log_id:     result.log_id,
    },
  }
}
