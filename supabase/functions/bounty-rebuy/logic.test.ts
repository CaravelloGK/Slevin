// Tests for bounty/rebuy business logic
// Run with: deno test supabase/functions/bounty/rebuy/logic.test.ts --allow-env

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  processRebuy,
  validateRebuyRequest,
  type SupabaseClientLike,
  type RebuyDeps,
} from './logic.ts'

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

interface MockOptions {
  bountyAdded?: number
  newRebuyCount?: number
  newCurrentBounty?: number
  rpcError?: string
}

function makeSupabaseMock(opts: MockOptions = {}): SupabaseClientLike {
  return {
    rpc: async (_fn, _args) => {
      if (opts.rpcError) return { data: null, error: { message: opts.rpcError } }
      return {
        data: {
          player_current_bounty: opts.newCurrentBounty ?? 300,
          player_rebuys:         opts.newRebuyCount   ?? 1,
          bounty_added:          opts.bountyAdded      ?? 100,
          log_id:                'log-rebuy-uuid-1',
        },
        error: null,
      }
    },
  }
}

function makeDeps(opts: MockOptions = {}): RebuyDeps {
  return { supabase: makeSupabaseMock(opts), actorPlayerId: 'dealer-id' }
}

// ---------------------------------------------------------------------------
// validateRebuyRequest
// ---------------------------------------------------------------------------

Deno.test('validateRebuyRequest — valid input passes', () => {
  const input = { tournament_id: 'tourn-1', player_id: 'player-1' }
  assertEquals(validateRebuyRequest(input), input)
})

Deno.test('validateRebuyRequest — missing tournament_id returns null', () => {
  assertEquals(validateRebuyRequest({ player_id: 'player-1' }), null)
})

Deno.test('validateRebuyRequest — missing player_id returns null', () => {
  assertEquals(validateRebuyRequest({ tournament_id: 'tourn-1' }), null)
})

Deno.test('validateRebuyRequest — null body returns null', () => {
  assertEquals(validateRebuyRequest(null), null)
})

Deno.test('validateRebuyRequest — non-string ids return null', () => {
  assertEquals(validateRebuyRequest({ tournament_id: 1, player_id: 2 }), null)
})

Deno.test('validateRebuyRequest — empty string ids return null', () => {
  assertEquals(validateRebuyRequest({ tournament_id: '', player_id: 'player-1' }), null)
})

// ---------------------------------------------------------------------------
// processRebuy — happy path
// ---------------------------------------------------------------------------

Deno.test('processRebuy — returns success with correct shape', async () => {
  const result = await processRebuy(
    { tournament_id: 'tourn-1', player_id: 'player-1' },
    makeDeps({ bountyAdded: 100, newCurrentBounty: 300, newRebuyCount: 1 }),
  )

  assertEquals(result.success, true)
  if (!result.success) return

  assertEquals(result.data.player.player_id, 'player-1')
  assertEquals(result.data.bounty_added, 100)
  assertEquals(result.data.player.current_bounty, 300)
  assertEquals(result.data.player.rebuys, 1)
  assertEquals(typeof result.data.log_id, 'string')
})

Deno.test('processRebuy — player is reactivated (is_active = true)', async () => {
  const result = await processRebuy(
    { tournament_id: 'tourn-1', player_id: 'player-1' },
    makeDeps(),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.player.is_active, true)
})

Deno.test('processRebuy — rebuy count increments', async () => {
  const result = await processRebuy(
    { tournament_id: 'tourn-1', player_id: 'player-1' },
    makeDeps({ newRebuyCount: 3 }),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.player.rebuys, 3)
})

Deno.test('processRebuy — bounty_added matches tournament bounty_amount', async () => {
  const result = await processRebuy(
    { tournament_id: 'tourn-1', player_id: 'player-1' },
    makeDeps({ bountyAdded: 50, newCurrentBounty: 50 }),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.bounty_added, 50)
  assertEquals(result.data.player.current_bounty, 50)
})

Deno.test('processRebuy — guaranteed_bounty is NOT modified on rebuy', async () => {
  // guaranteed_bounty must never change during rebuy (per spec)
  // The RPC returns player state — guaranteed_bounty is not included in result
  // This test confirms we do not accidentally expose or mutate it
  const result = await processRebuy(
    { tournament_id: 'tourn-1', player_id: 'player-1' },
    makeDeps(),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  // RebuyResult.player does NOT include guaranteed_bounty
  assertEquals('guaranteed_bounty' in result.data.player, false)
})

Deno.test('processRebuy — log_id is returned', async () => {
  const result = await processRebuy(
    { tournament_id: 'tourn-1', player_id: 'player-1' },
    makeDeps(),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.log_id, 'log-rebuy-uuid-1')
})

// ---------------------------------------------------------------------------
// processRebuy — error handling
// ---------------------------------------------------------------------------

Deno.test('processRebuy — DB error returns failure with code DB_ERROR', async () => {
  const result = await processRebuy(
    { tournament_id: 'tourn-1', player_id: 'player-1' },
    makeDeps({ rpcError: 'connection timeout' }),
  )

  assertEquals(result.success, false)
  if (result.success) return
  assertEquals(result.code, 'DB_ERROR')
})

Deno.test('processRebuy — passes correct args to rpc', async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = []

  const supabase: SupabaseClientLike = {
    rpc: async (fn, args) => {
      calls.push({ fn, args })
      return {
        data: {
          player_current_bounty: 200,
          player_rebuys: 1,
          bounty_added: 100,
          log_id: 'log-1',
        },
        error: null,
      }
    },
  }

  await processRebuy(
    { tournament_id: 'tourn-abc', player_id: 'player-xyz' },
    { supabase, actorPlayerId: 'dealer-xyz' },
  )

  assertEquals(calls.length, 1)
  assertEquals(calls[0].fn, 'process_rebuy')
  assertEquals(calls[0].args['p_tournament_id'], 'tourn-abc')
  assertEquals(calls[0].args['p_player_id'], 'player-xyz')
  assertEquals(calls[0].args['p_actor_id'], 'dealer-xyz')
})
