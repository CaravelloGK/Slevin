// Tests for bounty/adjust business logic
// Run with: deno test supabase/functions/bounty/adjust/logic.test.ts --allow-env

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  processAdjust,
  validateAdjustRequest,
  type SupabaseClientLike,
  type AdjustDeps,
} from './logic.ts'

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

interface MockOptions {
  newBounty?: number
  rpcError?: string
  rpcCode?: string
}

function makeSupabaseMock(opts: MockOptions = {}): SupabaseClientLike {
  return {
    rpc: async (_fn, args) => {
      if (opts.rpcError) {
        return {
          data: null,
          error: { message: opts.rpcError, code: opts.rpcCode ?? 'P0001' },
        }
      }
      const delta = args['p_delta'] as number
      const base  = opts.newBounty ?? 150
      return {
        data: {
          new_bounty: base,
          delta,
          log_id: 'log-adjust-uuid-1',
        },
        error: null,
      }
    },
  }
}

function makeDeps(opts: MockOptions = {}): AdjustDeps {
  return { supabase: makeSupabaseMock(opts), actorPlayerId: 'admin-id' }
}

// ---------------------------------------------------------------------------
// validateAdjustRequest
// ---------------------------------------------------------------------------

Deno.test('validateAdjustRequest — valid positive delta passes', () => {
  const input = {
    tournament_id: 'tourn-1',
    player_id:     'player-1',
    delta:         50,
    reason:        'correction',
  }
  assertEquals(validateAdjustRequest(input), input)
})

Deno.test('validateAdjustRequest — valid negative delta passes', () => {
  const input = {
    tournament_id: 'tourn-1',
    player_id:     'player-1',
    delta:         -25,
    reason:        'overpaid',
  }
  assertEquals(validateAdjustRequest(input), input)
})

Deno.test('validateAdjustRequest — delta = 0 returns null', () => {
  assertEquals(
    validateAdjustRequest({ tournament_id: 'tourn-1', player_id: 'p1', delta: 0, reason: 'x' }),
    null,
  )
})

Deno.test('validateAdjustRequest — missing tournament_id returns null', () => {
  assertEquals(
    validateAdjustRequest({ player_id: 'p1', delta: 10, reason: 'x' }),
    null,
  )
})

Deno.test('validateAdjustRequest — missing player_id returns null', () => {
  assertEquals(
    validateAdjustRequest({ tournament_id: 'tourn-1', delta: 10, reason: 'x' }),
    null,
  )
})

Deno.test('validateAdjustRequest — missing delta returns null', () => {
  assertEquals(
    validateAdjustRequest({ tournament_id: 'tourn-1', player_id: 'p1', reason: 'x' }),
    null,
  )
})

Deno.test('validateAdjustRequest — missing reason returns null', () => {
  assertEquals(
    validateAdjustRequest({ tournament_id: 'tourn-1', player_id: 'p1', delta: 10 }),
    null,
  )
})

Deno.test('validateAdjustRequest — empty reason string returns null', () => {
  assertEquals(
    validateAdjustRequest({ tournament_id: 'tourn-1', player_id: 'p1', delta: 10, reason: '' }),
    null,
  )
})

Deno.test('validateAdjustRequest — non-integer delta returns null', () => {
  assertEquals(
    validateAdjustRequest({ tournament_id: 't1', player_id: 'p1', delta: 1.5, reason: 'x' }),
    null,
  )
})

Deno.test('validateAdjustRequest — non-numeric delta returns null', () => {
  assertEquals(
    validateAdjustRequest({ tournament_id: 't1', player_id: 'p1', delta: '10', reason: 'x' }),
    null,
  )
})

Deno.test('validateAdjustRequest — null body returns null', () => {
  assertEquals(validateAdjustRequest(null), null)
})

// ---------------------------------------------------------------------------
// processAdjust — happy path
// ---------------------------------------------------------------------------

Deno.test('processAdjust — positive delta: returns correct new_bounty', async () => {
  const result = await processAdjust(
    { tournament_id: 'tourn-1', player_id: 'player-1', delta: 50, reason: 'correction' },
    makeDeps({ newBounty: 250 }),
  )

  assertEquals(result.success, true)
  if (!result.success) return

  assertEquals(result.data.player.player_id, 'player-1')
  assertEquals(result.data.new_bounty, 250)
  assertEquals(result.data.delta, 50)
  assertEquals(typeof result.data.log_id, 'string')
})

Deno.test('processAdjust — negative delta: returns correct new_bounty', async () => {
  const result = await processAdjust(
    { tournament_id: 'tourn-1', player_id: 'player-1', delta: -30, reason: 'overpaid' },
    makeDeps({ newBounty: 70 }),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.new_bounty, 70)
  assertEquals(result.data.delta, -30)
})

Deno.test('processAdjust — result.player.current_bounty equals new_bounty', async () => {
  const result = await processAdjust(
    { tournament_id: 'tourn-1', player_id: 'player-1', delta: 10, reason: 'x' },
    makeDeps({ newBounty: 110 }),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.player.current_bounty, result.data.new_bounty)
})

Deno.test('processAdjust — log_id is returned', async () => {
  const result = await processAdjust(
    { tournament_id: 'tourn-1', player_id: 'player-1', delta: 10, reason: 'x' },
    makeDeps(),
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.log_id, 'log-adjust-uuid-1')
})

// ---------------------------------------------------------------------------
// processAdjust — error handling
// ---------------------------------------------------------------------------

Deno.test('processAdjust — DB error returns failure with code DB_ERROR', async () => {
  const result = await processAdjust(
    { tournament_id: 'tourn-1', player_id: 'player-1', delta: 10, reason: 'x' },
    makeDeps({ rpcError: 'connection refused' }),
  )

  assertEquals(result.success, false)
  if (result.success) return
  assertEquals(result.code, 'DB_ERROR')
})

Deno.test('processAdjust — bounty_below_zero error returns BOUNTY_BELOW_ZERO code', async () => {
  const result = await processAdjust(
    { tournament_id: 'tourn-1', player_id: 'player-1', delta: -999, reason: 'x' },
    makeDeps({ rpcError: 'bounty_below_zero', rpcCode: 'P0002' }),
  )

  assertEquals(result.success, false)
  if (result.success) return
  assertEquals(result.code, 'BOUNTY_BELOW_ZERO')
})

Deno.test('processAdjust — passes correct args to rpc', async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = []

  const supabase: SupabaseClientLike = {
    rpc: async (fn, args) => {
      calls.push({ fn, args })
      return {
        data: { new_bounty: 200, delta: 50, log_id: 'log-1' },
        error: null,
      }
    },
  }

  await processAdjust(
    { tournament_id: 'tourn-abc', player_id: 'player-xyz', delta: 50, reason: 'test' },
    { supabase, actorPlayerId: 'admin-xyz' },
  )

  assertEquals(calls.length, 1)
  assertEquals(calls[0].fn, 'process_bounty_adjust')
  assertEquals(calls[0].args['p_tournament_id'], 'tourn-abc')
  assertEquals(calls[0].args['p_player_id'], 'player-xyz')
  assertEquals(calls[0].args['p_delta'], 50)
  assertEquals(calls[0].args['p_reason'], 'test')
  assertEquals(calls[0].args['p_actor_id'], 'admin-xyz')
})
