// Business logic for bounty/rebuy Edge Function

import type {
  RebuyRequest,
  RebuyResult,
  ApiResponse,
} from '../_shared/types.ts'

export interface SupabaseClientLike {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}

export interface RebuyDeps {
  supabase: SupabaseClientLike
  actorPlayerId: string
}

interface RpcResult {
  player_current_bounty: number
  player_rebuys: number
  bounty_added: number
  log_id: string
}

export function validateRebuyRequest(body: unknown): RebuyRequest | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null

  const b = body as Record<string, unknown>

  if (typeof b.tournament_id !== 'string' || typeof b.player_id !== 'string') return null
  if (!b.tournament_id || !b.player_id) return null

  return { tournament_id: b.tournament_id, player_id: b.player_id }
}

export async function processRebuy(
  req: RebuyRequest,
  deps: RebuyDeps,
): Promise<ApiResponse<RebuyResult>> {
  const { data, error } = await deps.supabase.rpc('process_rebuy', {
    p_tournament_id: req.tournament_id,
    p_player_id:     req.player_id,
    p_actor_id:      deps.actorPlayerId,
  })

  if (error) {
    return { success: false, error: 'Rebuy failed', code: 'DB_ERROR' }
  }

  const result = data as RpcResult

  return {
    success: true,
    data: {
      player: {
        player_id:      req.player_id,
        current_bounty: result.player_current_bounty,
        rebuys:         result.player_rebuys,
        is_active:      true,
      },
      bounty_added: result.bounty_added,
      log_id:       result.log_id,
    },
  }
}
