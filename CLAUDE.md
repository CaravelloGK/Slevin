# Slevin — Project CLAUDE.md

> Poker tournament management platform. Private live tournament OS.
> Stack: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui, Supabase, Vercel.

## Project Overview

**Stack:** Next.js 15 (App Router), TypeScript, Supabase (auth + PostgreSQL + Realtime + Edge Functions), TailwindCSS, shadcn/ui

**Architecture:** Server Components by default. Client Components only for interactivity (dealer panel, timer, realtime subscriptions). Server Actions for all mutations. Edge Functions for transactional business logic (bounty engine).

**Primary UI:** Dealer Control Panel — tablet-optimized PWA, landscape orientation.

## Critical Rules

### Bounty Engine

- Bounty calculations MUST run in Supabase Edge Functions — never on the client
- Never accept client-submitted bounty values as authoritative
- All elimination and rebuy mutations run inside a single database transaction
- Formula: `killer.guaranteed_bounty += floor(victim.current_bounty * 0.5)`, `killer.current_bounty += floor(victim.current_bounty * 0.5)`
- Rebuy: `current_bounty += tournament.bounty_amount`, `guaranteed_bounty` is never modified on rebuy

### Database

- All queries use Supabase client with RLS enabled — never bypass RLS
- Migrations in `supabase/migrations/` — never modify the database directly
- Use `select()` with explicit column lists, not `select('*')`
- All user-facing list queries must include `.limit()` to prevent unbounded results
- Timer state is stored in `tournaments.current_level` and `tournaments.level_started_at` — client calculates remaining time from server timestamp

### Authentication

- Use `createServerClient()` from `@supabase/ssr` in Server Components and Server Actions
- Use `createBrowserClient()` from `@supabase/ssr` in Client Components
- Protected routes check `getUser()` — never trust `getSession()` alone
- Middleware in `middleware.ts` refreshes auth tokens on every request
- Roles: `admin`, `dealer`, `player` — enforced via JWT claims and RLS policies

### Realtime

- Dealer Control Panel subscribes to `tournament_players` and `tournaments` via Supabase Realtime
- Never poll — all live state updates come through Realtime subscriptions
- Show connection status indicator in dealer UI at all times

### Offline Safety

- All dealer mutations must write to IndexedDB offline queue before attempting network call
- Service Worker replays queue on reconnect — strictly sequential, never parallel
- Show pending sync count in dealer UI when offline

### Event Logging

- Every state change produces a `tournament_logs` entry — no silent mutations
- Log must include: `tournament_id`, `timestamp`, `event_type`, `actor_player_id`, `data_json`, `source`
- Valid `source` values: `dealer`, `voice`, `system`, `cv`

### Code Style

- No emojis in code, comments, or UI (unless explicitly requested)
- Immutable patterns — spread operator, never mutate state directly
- Server Components: no `'use client'`, no `useState`/`useEffect`
- Client Components: `'use client'` at top, extract logic to custom hooks
- Zod schemas for all input validation: API routes, Server Actions, environment variables
- No `any` types — use generated Supabase types from `database.types.ts`

### Voice Command Module

- Parser is deterministic and rule-based — do not introduce LLM calls for voice parsing
- Always require explicit confirmation modal before dispatching a voice command
- Voice commands call the same Server Actions as manual UI interactions
- Log voice commands with `source: 'voice'` and include both `raw` transcript and `parsed` result in `data_json`

## File Structure

```
src/
  app/
    (auth)/                  # Login page
    (admin)/                 # Admin panel: players, tournaments, blind structures
    (dealer)/
      tournament/[id]/       # Dealer Control Panel (primary tablet UI)
    (player)/
      tournament/[id]/live/  # Player spectator view
      tournament/[id]/report/
      player/[id]/           # Player profile + stats
      history/               # Cross-tournament statistics
    api/
      webhooks/              # Supabase webhooks
    layout.tsx
  components/
    ui/                      # shadcn/ui base components
    dealer/                  # Dealer Control Panel components
    player-card/             # Player card with bounty display
    blind-timer/             # Timer display and controls
    voice/                   # Voice command UI and confirmation modal
    tournament/              # Shared tournament components
  hooks/
    use-tournament-realtime.ts
    use-blind-timer.ts
    use-voice-commands.ts
    use-offline-queue.ts
  lib/
    supabase/
      server.ts              # createServerClient factory
      client.ts              # createBrowserClient factory
    bounty/                  # Bounty calculation types and helpers
    voice/                   # Command parser, action dispatcher
    offline/                 # IndexedDB queue, sync engine
    utils.ts
  types/
    database.types.ts        # Generated from Supabase schema
    tournament.ts            # Domain types
    events.ts                # Event type definitions
supabase/
  functions/
    bounty/
      knockout/index.ts      # Elimination Edge Function
      rebuy/index.ts         # Rebuy Edge Function
      adjust/index.ts        # Manual adjustment Edge Function
  migrations/                # Database migrations
  seed.sql                   # Development seed data
```

## Key Patterns

### API Response Format

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

### Server Action Pattern

```typescript
'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const schema = z.object({
  tournament_id: z.string().uuid(),
  killer_id: z.string().uuid(),
  victim_id: z.string().uuid(),
})

export async function recordKnockout(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Delegate to Edge Function — never compute bounty in Server Action
  const { data, error } = await supabase.functions.invoke('bounty/knockout', {
    body: parsed.data,
  })

  if (error) return { success: false, error: 'Knockout failed' }
  return { success: true, data }
}
```

### Realtime Subscription Pattern

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { TournamentPlayer } from '@/types/tournament'

export function useTournamentRealtime(tournamentId: string) {
  const [players, setPlayers] = useState<TournamentPlayer[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_players',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          // update local state from payload
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId])

  return players
}
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # Server-only, never expose to client

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema (Core Tables)

```sql
-- players, tournaments, blind_structures, blind_levels
-- tournament_players, tournament_logs

-- Key constraints:
-- tournament_players.current_bounty >= 0
-- tournament_logs.event_type in known enum values
-- tournaments.status in ('pending','running','paused','finished')
```

See `supabase/migrations/` for full schema.

## Event Type Reference

| event_type | Source | Description |
|---|---|---|
| `player.eliminated` | dealer / voice | Knockout recorded |
| `player.rebuy` | dealer / voice | Rebuy processed |
| `player.bounty_adjusted` | dealer | Manual bounty adjustment |
| `timer.level_advanced` | system / dealer | Blind level changed |
| `timer.paused` | dealer / voice | Timer paused |
| `timer.resumed` | dealer / voice | Timer resumed |
| `tournament.started` | admin | Tournament opened |
| `tournament.finished` | system | Last player standing |
| `voice.command_received` | voice | Raw + parsed transcript |
| `voice.command_executed` | voice | Confirmed and dispatched |
| `cv.hand_started` | cv | Computer vision event (future) |

## PWA Configuration

- `display: standalone`, default orientation: landscape (dealer), any (player)
- Service Worker: Network-first for API, Cache-first for static assets
- Pre-cache: dealer panel shell, blind timer, player cards
- Offline banner shown when `navigator.onLine === false`

## Testing Strategy

```bash
/tdd                    # Unit + integration tests for new features
/e2e                    # Playwright tests for dealer flow, tournament lifecycle
```

### Critical Flows to Test

1. Create tournament → register players → start → eliminate → rebuy → finish
2. Bounty math: elimination transfers exactly 50% to guaranteed, 50% to current
3. Offline: queue mutations → reconnect → verify server state matches expected
4. Voice: parse "X eliminated Y" → confirm modal → verify log entry created
5. Timer: level advance → verify `tournaments` row updated → all clients sync

## ECC Workflow

```bash
# Planning a feature
/plan "Add rebuy limit to tournament configuration"

# Developing with TDD
/tdd

# Before committing
/simplify
/security-review

# Before release
/e2e
```

## Git Workflow

- `feat:` new features, `fix:` bug fixes, `refactor:` code changes
- Feature branches from `main`, PRs required
- Deploy: Vercel preview on PR, production on merge to `main`
