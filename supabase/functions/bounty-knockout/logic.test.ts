// Tests for bounty/knockout business logic
// Run with: deno test supabase/functions/bounty/knockout/logic.test.ts --allow-env

import {
  assertEquals,
  assertRejects,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  processKnockout,
  calculateBountyTransfer,
  validateKnockoutRequest,
  type SupabaseClientLike,
  type KnockoutDeps,
} from './logic.ts'
import type { TournamentPlayer } from '../../_shared/types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTournamentPlayer(overrides: Partial<TournamentPlayer> = {}): TournamentPlayer {
  return {
    id: 'tp-default',
    tournament_id: 'tourn-1',
    player_id: 'player-default',
    current_bounty: 100,
    guaranteed_bounty: 0,
    rebuys: 0,
    is_active: true,
    finish_position: null,
    registered_at: new Date().toISOString(),
    ...overrides,
  }
}

/** Builds a minimal SupabaseClientLike mock. */
function makeSupabaseMock(overrides: {
  victim?: Partial<TournamentPlayer>
  killer?: Partial<TournamentPlayer>
  activeCount?: number
  rpcError?: string
  insertError?: string
  updateError?: string
} = {}): SupabaseClientLike {
  const victim = makeTournamentPlayer({
    id: 'tp-victim',
    player_id: 'victim-id',
    current_bounty: overrides.victim?.current_bounty ?? 200,
    is_active: overrides.victim?.is_active ?? true,
    finish_position: overrides.victim?.finish_position ?? null,
    ...overrides.victim,
  })
  const killer = makeTournamentPlayer({
    id: 'tp-killer',
    player_id: 'killer-id',
    current_bounty: overrides.killer?.current_bounty ?? 100,
    guaranteed_bounty: overrides.killer?.guaranteed_bounty ?? 50,
    ...overrides.killer,
  })

  const activeCount = overrides.activeCount ?? 5

  return {
    rpc: async (fn, _args) => {
      if (overrides.rpcError) return { data: null, error: { message: overrides.rpcError } }
      if (fn === 'process_knockout') {
        return {
          data: {
            killer_guaranteed_bounty: killer.guaranteed_bounty + Math.floor(victim.current_bounty * 0.5),
            killer_current_bounty: killer.current_bounty + Math.floor(victim.current_bounty * 0.5),
            victim_finish_position: activeCount,
            bounty_transferred: victim.current_bounty,
            log_id: 'log-uuid-1',
          },
          error: null,
        }
      }
      return { data: null, error: { message: 'unknown rpc' } }
    },
    from: (table: string) => {
      const builder: ReturnType<SupabaseClientLike['from']> = {
        select: (_cols) => builder,
        eq: (_col, _val) => builder,
        single: async () => {
          if (table === 'tournament_players') {
            // Differentiate by call sequence is not possible in this simple mock —
            // callers are expected to pass victim/killer explicitly via rpc.
            return { data: victim, error: null }
          }
          return { data: null, error: { message: 'not found' } }
        },
        insert: async (_row) => {
          if (overrides.insertError) return { data: null, error: { message: overrides.insertError } }
          return { data: { id: 'log-uuid-1' }, error: null }
        },
        update: (_vals) => builder,
      }
      return builder
    },
  }
}

// ---------------------------------------------------------------------------
// Unit tests: calculateBountyTransfer
// ---------------------------------------------------------------------------

Deno.test('calculateBountyTransfer — even bounty splits equally', () => {
  const { half, remainder } = calculateBountyTransfer(200)
  assertEquals(half, 100)
  assertEquals(remainder, 0)
})

Deno.test('calculateBountyTransfer — odd bounty floors the half', () => {
  const { half, remainder } = calculateBountyTransfer(101)
  assertEquals(half, 50)      // floor(101 * 0.5) = 50
  assertEquals(remainder, 1)  // 101 - 50 - 50 = 1 (stays with victim → becomes 0 in DB)
})

Deno.test('calculateBountyTransfer — zero bounty returns zeros', () => {
  const { half, remainder } = calculateBountyTransfer(0)
  assertEquals(half, 0)
  assertEquals(remainder, 0)
})

Deno.test('calculateBountyTransfer — large bounty', () => {
  const { half } = calculateBountyTransfer(999)
  assertEquals(half, 499) // floor(999 * 0.5) = 499
})

// ---------------------------------------------------------------------------
// Unit tests: validateKnockoutRequest
// ---------------------------------------------------------------------------

Deno.test('validateKnockoutRequest — valid input passes', () => {
  const input = {
    tournament_id: '550e8400-e29b-41d4-a716-446655440000',
    killer_id: '550e8400-e29b-41d4-a716-446655440001',
    victim_id: '550e8400-e29b-41d4-a716-446655440002',
  }
  const result = validateKnockoutRequest(input)
  assertEquals(result, input)
})

Deno.test('validateKnockoutRequest — missing tournament_id returns null', () => {
  const result = validateKnockoutRequest({ killer_id: 'a', victim_id: 'b' })
  assertEquals(result, null)
})

Deno.test('validateKnockoutRequest — missing killer_id returns null', () => {
  const result = validateKnockoutRequest({ tournament_id: 'a', victim_id: 'b' })
  assertEquals(result, null)
})

Deno.test('validateKnockoutRequest — missing victim_id returns null', () => {
  const result = validateKnockoutRequest({ tournament_id: 'a', killer_id: 'b' })
  assertEquals(result, null)
})

Deno.test('validateKnockoutRequest — killer and victim same player returns null', () => {
  const result = validateKnockoutRequest({
    tournament_id: 'tourn-1',
    killer_id: 'same-id',
    victim_id: 'same-id',
  })
  assertEquals(result, null)
})

Deno.test('validateKnockoutRequest — null body returns null', () => {
  assertEquals(validateKnockoutRequest(null), null)
})

Deno.test('validateKnockoutRequest — non-string ids return null', () => {
  assertEquals(validateKnockoutRequest({ tournament_id: 1, killer_id: 2, victim_id: 3 }), null)
})

// ---------------------------------------------------------------------------
// Integration tests: processKnockout
// ---------------------------------------------------------------------------

Deno.test('processKnockout — happy path: correct bounty math', async () => {
  const supabase = makeSupabaseMock({
    victim: { current_bounty: 200 },
    killer: { current_bounty: 100, guaranteed_bounty: 50 },
    activeCount: 5,
  })

  const deps: KnockoutDeps = { supabase, actorPlayerId: 'dealer-user-id' }

  const result = await processKnockout(
    { tournament_id: 'tourn-1', killer_id: 'killer-id', victim_id: 'victim-id' },
    deps,
  )

  assertEquals(result.success, true)
  if (!result.success) return

  // killer gains floor(200 * 0.5) = 100 to guaranteed AND current
  assertEquals(result.data.killer.guaranteed_bounty, 150) // 50 + 100
  assertEquals(result.data.killer.current_bounty, 200)    // 100 + 100
  assertEquals(result.data.victim.current_bounty, 0)
  assertEquals(result.data.victim.is_active, false)
  assertEquals(result.data.bounty_transferred, 200)
})

Deno.test('processKnockout — odd bounty: uses floor()', async () => {
  const supabase = makeSupabaseMock({
    victim: { current_bounty: 101 },
    killer: { current_bounty: 0, guaranteed_bounty: 0 },
    activeCount: 3,
  })

  const deps: KnockoutDeps = { supabase, actorPlayerId: 'dealer-id' }

  const result = await processKnockout(
    { tournament_id: 'tourn-1', killer_id: 'killer-id', victim_id: 'victim-id' },
    deps,
  )

  assertEquals(result.success, true)
  if (!result.success) return

  // floor(101 * 0.5) = 50
  assertEquals(result.data.killer.guaranteed_bounty, 50)
  assertEquals(result.data.killer.current_bounty, 50)
  assertEquals(result.data.bounty_transferred, 101)
})

Deno.test('processKnockout — finish_position assigned correctly', async () => {
  // 4 players remain active before this elimination → victim finishes 4th
  const supabase = makeSupabaseMock({ activeCount: 4 })
  const deps: KnockoutDeps = { supabase, actorPlayerId: 'dealer-id' }

  const result = await processKnockout(
    { tournament_id: 'tourn-1', killer_id: 'killer-id', victim_id: 'victim-id' },
    deps,
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.victim.finish_position, 4)
})

Deno.test('processKnockout — DB error propagates as failure response', async () => {
  const supabase = makeSupabaseMock({ rpcError: 'deadlock detected' })
  const deps: KnockoutDeps = { supabase, actorPlayerId: 'dealer-id' }

  const result = await processKnockout(
    { tournament_id: 'tourn-1', killer_id: 'killer-id', victim_id: 'victim-id' },
    deps,
  )

  assertEquals(result.success, false)
  if (result.success) return
  assertEquals(result.code, 'DB_ERROR')
})

Deno.test('processKnockout — log_id is returned in result', async () => {
  const supabase = makeSupabaseMock()
  const deps: KnockoutDeps = { supabase, actorPlayerId: 'dealer-id' }

  const result = await processKnockout(
    { tournament_id: 'tourn-1', killer_id: 'killer-id', victim_id: 'victim-id' },
    deps,
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(typeof result.data.log_id, 'string')
})

Deno.test('processKnockout — victim with zero bounty still deactivates', async () => {
  const supabase = makeSupabaseMock({
    victim: { current_bounty: 0 },
    killer: { guaranteed_bounty: 0, current_bounty: 0 },
  })
  const deps: KnockoutDeps = { supabase, actorPlayerId: 'dealer-id' }

  const result = await processKnockout(
    { tournament_id: 'tourn-1', killer_id: 'killer-id', victim_id: 'victim-id' },
    deps,
  )

  assertEquals(result.success, true)
  if (!result.success) return
  assertEquals(result.data.victim.is_active, false)
  assertEquals(result.data.victim.current_bounty, 0)
  assertEquals(result.data.killer.guaranteed_bounty, 0) // nothing transferred
})
