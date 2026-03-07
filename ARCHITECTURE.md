● SLEVIN — System Architecture & Implementation Plan

  ---
  1. Architectural Overview

  Slevin is a modular, event-driven poker operating system built on a Next.js + Supabase stack. The architecture is organized around three primary concerns:

  - Real-time state management (live tournament operations)
  - Transactional integrity (bounty calculations, eliminations)
  - Historical data & analytics (stats, reports)

  ┌─────────────────────────────────────────────────────────┐
  │                        CLIENTS                          │
  │  Dealer Panel (Tablet PWA) │ Player View │ Admin Panel  │
  └────────────────┬────────────────────────────────────────┘
                   │ HTTPS / WebSocket
  ┌────────────────▼────────────────────────────────────────┐
  │                    NEXT.JS (Vercel)                      │
  │  App Router  │  Server Actions  │  API Routes            │
  │  PWA Service Worker  │  Offline Queue                   │
  └────────────────┬────────────────────────────────────────┘
                   │ Supabase Client / REST / Realtime
  ┌────────────────▼────────────────────────────────────────┐
  │                      SUPABASE                           │
  │  PostgreSQL  │  Realtime  │  Storage  │  Edge Functions  │
  │  Row Level Security  │  Auth                            │
  └─────────────────────────────────────────────────────────┘
                   │ (Future)
  ┌────────────────▼────────────────────────────────────────┐
  │          PYTHON CV ENGINE (separate service)            │
  │  OpenCV  │  Event Emitter → Supabase REST               │
  └─────────────────────────────────────────────────────────┘

  ---
  2. Module Map

  slevin/
  ├── modules/
  │   ├── player-registry/       # Global player CRUD, avatars
  │   ├── tournament-manager/    # Create, configure, run tournaments
  │   ├── bounty-engine/         # Server-side bounty calculation logic
  │   ├── dealer-control-panel/  # Primary tablet UI
  │   ├── blind-timer/           # Level clock, blind progression
  │   ├── tournament-reports/    # Post-tournament summaries
  │   ├── historical-stats/      # Cross-tournament analytics
  │   └── voice-command/         # Speech → parsed command → action
  └── shared/
      ├── db/                    # Supabase client, typed schema
      ├── events/                # Event type definitions, log writers
      ├── offline/               # Queue, sync engine
      └── auth/                  # Role guards (dealer, player, admin)

  ---
  3. Database Schema (Extended)

  players

  id               uuid PK
  name             text NOT NULL
  avatar_url       text
  created_at       timestamptz

  blind_structures

  id               uuid PK
  name             text NOT NULL        -- "Standard 20-Level"
  created_by       uuid → players
  is_template      boolean DEFAULT false
  created_at       timestamptz

  blind_levels

  id               uuid PK
  structure_id     uuid → blind_structures
  level_number     int NOT NULL
  small_blind      int NOT NULL
  big_blind        int NOT NULL
  duration_seconds int NOT NULL         -- default 900 (15 min)
  ante             int DEFAULT 0

  tournaments

  id               uuid PK
  title            text NOT NULL
  date             date NOT NULL
  entry_amount     int NOT NULL
  bounty_amount    int NOT NULL
  starting_stack   int NOT NULL
  structure_id     uuid → blind_structures
  status           enum('pending','running','paused','finished')
  current_level    int DEFAULT 1
  level_started_at timestamptz
  created_at       timestamptz
  created_by       uuid → players       -- admin

  tournament_players

  id               uuid PK
  tournament_id    uuid → tournaments
  player_id        uuid → players
  current_bounty   int NOT NULL
  guaranteed_bounty int DEFAULT 0
  rebuys           int DEFAULT 0
  is_active        boolean DEFAULT true
  finish_position  int                  -- NULL until eliminated
  registered_at    timestamptz

  tournament_logs

  id               uuid PK
  tournament_id    uuid → tournaments
  timestamp        timestamptz NOT NULL
  event_type       text NOT NULL        -- enum enforced in app layer
  actor_player_id  uuid → players       -- who performed the action
  data_json        jsonb NOT NULL
  source           text                 -- 'dealer', 'voice', 'system', 'cv'

  offline_queue (client-side IndexedDB, not Postgres)

  id               local uuid
  tournament_id    uuid
  timestamp        int (unix ms)
  event_type       text
  data_json        object
  synced           boolean

  ---
  4. Event Type Taxonomy

  Every state change produces a log entry. Standardize event types:

  ┌────────────────────────┬────────────────────────────┬────────────────────────────────────────────┐
  │       event_type       │          Trigger           │               data_json keys               │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ tournament.started     │ Admin starts tournament    │ {structure_id}                             │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ tournament.paused      │ Dealer pauses              │ {}                                         │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ tournament.finished    │ Last player standing       │ {winner_id}                                │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ player.registered      │ Player added to tournament │ {player_id, bounty}                        │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ player.eliminated      │ Knockout recorded          │ {killer_id, victim_id, bounty_transferred} │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ player.rebuy           │ Rebuy processed            │ {player_id, rebuy_count, bounty_added}     │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ player.bounty_adjusted │ Manual adjust              │ {player_id, delta, reason}                 │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ timer.level_advanced   │ Level skipped or natural   │ {from_level, to_level}                     │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ timer.paused           │ Timer paused               │ {remaining_seconds}                        │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ timer.resumed          │ Timer resumed              │ {remaining_seconds}                        │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ voice.command_received │ Raw speech                 │ {raw, parsed}                              │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ voice.command_executed │ After confirmation         │ {action, params}                           │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ cv.hand_started        │ CV engine event            │ {hand_id}                                  │
  ├────────────────────────┼────────────────────────────┼────────────────────────────────────────────┤
  │ cv.chip_movement       │ CV engine event            │ {player_id, delta}                         │
  └────────────────────────┴────────────────────────────┴────────────────────────────────────────────┘

  ---
  5. Bounty Engine Specification

  Implemented as a Supabase Edge Function (/functions/bounty/knockout)

  The Edge Function is the single source of truth for bounty math. Never trust client-submitted bounty values.

  POST /functions/v1/bounty/knockout
  Body: { tournament_id, killer_id, victim_id }

  Server-side logic:
  1. SELECT tournament_player WHERE tournament_id AND player_id = victim_id → victim_tp
  2. SELECT tournament_player WHERE tournament_id AND player_id = killer_id → killer_tp
  3. transferred = victim_tp.current_bounty
  4. killer_tp.guaranteed_bounty += floor(transferred * 0.5)
  5. killer_tp.current_bounty   += floor(transferred * 0.5)
  6. victim_tp.current_bounty = 0
  7. victim_tp.is_active = false
  8. victim_tp.finish_position = current_active_count + 1
  9. INSERT tournament_log (event_type: 'player.eliminated', data)
  10. Return updated state

  All steps in a single database transaction.

  Rebuy Edge Function (/functions/v1/bounty/rebuy):
  1. tournament_player.rebuys += 1
  2. tournament_player.current_bounty += tournament.bounty_amount
  3. tournament_player.is_active = true
  4. INSERT tournament_log (event_type: 'player.rebuy')

  ---
  6. Real-time Architecture

  Supabase Realtime subscriptions drive live UI updates.

  Dealer performs action
    → Next.js Server Action calls Edge Function
    → Edge Function commits transaction to Postgres
    → Postgres triggers Supabase Realtime broadcast
    → All subscribed clients receive delta update
    → UI re-renders without polling

  Subscriptions needed:
  - tournament_players WHERE tournament_id = X — dealer panel live state
  - tournaments WHERE id = X — timer/level changes
  - tournament_logs WHERE tournament_id = X — live event feed

  ---
  7. Voice Command Module Architecture

  Browser Web Speech API
    → SpeechRecognition stream
    → Transcript string

  Command Parser (client-side, runs in-browser)
    → Token extraction (playerNames[], action, numeric values)
    → Fuzzy match player names against active tournament roster
    → Produce ParsedCommand object

  Confirmation Modal
    → Display: "Eliminate [Max] by [Gio]? Confirm / Cancel"
    → Dealer confirms

  Action Dispatcher
    → Calls same Next.js Server Action as manual button tap
    → Logs source='voice' in tournament_log

  Parser rules (deterministic NLP, no LLM needed initially):

  ┌────────────────────────────────────┬──────────────────────┬─────────────────────────────┐
  │              Pattern               │        Action        │            Notes            │
  ├────────────────────────────────────┼──────────────────────┼─────────────────────────────┤
  │ [name] eliminated [name]           │ knockout             │ order matters: killer first │
  ├────────────────────────────────────┼──────────────────────┼─────────────────────────────┤
  │ [name] knocked out [name]          │ knockout             │ alias                       │
  ├────────────────────────────────────┼──────────────────────┼─────────────────────────────┤
  │ rebuy [name]                       │ rebuy                │                             │
  ├────────────────────────────────────┼──────────────────────┼─────────────────────────────┤
  │ adjust bounty [name] [+/-][amount] │ manual_adjust        │                             │
  ├────────────────────────────────────┼──────────────────────┼─────────────────────────────┤
  │ pause timer                        │ timer.pause          │                             │
  ├────────────────────────────────────┼──────────────────────┼─────────────────────────────┤
  │ resume timer                       │ timer.resume         │                             │
  ├────────────────────────────────────┼──────────────────────┼─────────────────────────────┤
  │ next level                         │ timer.level_advanced │ requires confirm            │
  └────────────────────────────────────┴──────────────────────┴─────────────────────────────┘

  Player name fuzzy matching: Levenshtein distance threshold (~2 chars) against active player names.

  ---
  8. Offline Safety Architecture

  Strategy: Optimistic local state + persistent queue + background sync

  IndexedDB (offline_queue table)
    → Stores all pending mutations with local timestamps

  Service Worker
    → Intercepts failed Supabase POST calls
    → Queues to IndexedDB
    → Shows offline banner in UI
    → Background sync API: when connection restores, replays queue in order
    → Marks each entry synced=true after confirmed server write

  UI State
    → Maintained in React context with local mutations
    → Pending items show visual indicator ("syncing...")
    → On sync complete, server state reconciles

  Critical rule: offline queue must preserve event ordering. Replay is sequential, not parallel.

  ---
  9. PWA Configuration

  manifest.json
    display: "standalone"
    orientation: "landscape" (dealer panel) / "any" (player view)
    theme_color: poker green (#1a4731)
    icons: 192px, 512px

  Service Worker
    Cache strategy: Network-first for API, Cache-first for static assets
    Pre-cache: dealer control panel shell, blind timer, player cards

  ---
  10. Role & Auth Model

  Supabase Auth + Row Level Security.

  ┌────────┬────────────────────────────────────────────────────────────────┐
  │  Role  │                          Capabilities                          │
  ├────────┼────────────────────────────────────────────────────────────────┤
  │ admin  │ Full access: create tournaments, manage players, view all data │
  ├────────┼────────────────────────────────────────────────────────────────┤
  │ dealer │ Operate running tournaments: eliminations, rebuys, timer       │
  ├────────┼────────────────────────────────────────────────────────────────┤
  │ player │ Read-only: own stats, tournament results, leaderboard          │
  ├────────┼────────────────────────────────────────────────────────────────┤
  │ viewer │ Public-facing read-only (optional, future)                     │
  └────────┴────────────────────────────────────────────────────────────────┘

  RLS policies enforce at DB level. Edge Functions verify JWT role claims before executing mutations.

  ---
  11. Application Routes

  /                          → Landing / dashboard
  /admin/                    → Admin panel
  /admin/players             → Player registry
  /admin/tournaments         → Tournament list, create
  /admin/structures          → Blind structure builder
  /tournament/[id]/dealer    → Dealer Control Panel (primary)
  /tournament/[id]/live      → Player spectator view
  /tournament/[id]/report    → Post-tournament report
  /player/[id]               → Player profile + stats
  /history                   → Cross-tournament statistics

  ---
  12. Development Phases

  ---
  Phase 1 — Foundation (Weeks 1–3)

  Goal: Working database + basic tournament lifecycle

  - Supabase project setup
    - Schema: players, tournaments, blind_structures, blind_levels, tournament_players, tournament_logs
    - RLS policies
    - Auth setup (admin + dealer roles)
  - Next.js project scaffold
    - App Router structure
    - Supabase client (typed, with generated types)
    - TailwindCSS + shadcn/ui baseline
    - PWA manifest + service worker skeleton
  - Admin panel basics
    - Player registry (create, edit, avatar upload)
    - Blind structure builder (CRUD for levels)
    - Tournament creation form
  - Player registration flow (add players to tournament)

  Deliverable: Admin can create a tournament with players and a blind structure.

  ---
  Phase 2 — Dealer Control Panel (Weeks 4–6)

  Goal: Fully operational live tournament management

  - Dealer Control Panel UI
    - Player card grid (avatar, name, bounties, rebuys, status)
    - Touch-optimized for tablet (large tap targets, swipe gestures)
    - Active vs. eliminated visual states
  - Bounty Engine Edge Functions
    - bounty/knockout — full elimination logic
    - bounty/rebuy — rebuy logic
    - bounty/manual_adjust — admin override
  - Tournament log writer (every action → tournament_logs)
  - Supabase Realtime integration
    - Live player card updates across all clients
    - Connection status indicator
  - Blind Timer
    - Level display, blind amounts, countdown
    - Pause / resume / skip level controls
    - Auto-advance at level expiry
    - Timer state persisted in tournaments.current_level + tournaments.level_started_at

  Deliverable: Dealer can run a complete tournament end-to-end.

  ---
  Phase 3 — Offline Safety & PWA (Week 7)

  Goal: Dealer panel works during network interruptions

  - IndexedDB offline queue implementation
  - Service Worker: offline detection, queue on failure
  - Background sync: replay queue on reconnect
  - UI indicators: offline banner, pending sync count
  - PWA install prompt + icons + manifest finalization
  - Test: simulate network drop mid-tournament, verify full recovery

  Deliverable: Tournament can run without internet for extended periods.

  ---
  Phase 4 — Voice Commands (Week 8)

  Goal: Hands-free dealer operation

  - Web Speech API integration
  - Command parser: token extraction, action mapping, player name fuzzy match
  - Confirmation modal UI (large, tablet-friendly)
  - Action dispatcher: routes parsed commands to same Server Actions as manual UI
  - Voice command logging (source='voice' in tournament_logs)
  - Fallback: graceful degradation when speech API unavailable

  Deliverable: Dealer can perform eliminations and rebuys by voice.

  ---
  Phase 5 — Reports & Statistics (Weeks 9–10)

  Goal: Historical data becomes useful

  - Tournament Report page
    - Final standings table
    - Bounty breakdown per player
    - Rebuy log
    - Knockout timeline (from tournament_logs)
    - Charts: stack progression (estimated), bounty accumulation
  - Player Profile page
    - Tournaments played, win rate, avg finish position
    - Total bounties earned across history
    - Knockout and rebuy counts
  - Historical Statistics page
    - Cross-tournament leaderboard (wins, ITM, bounty leaders)
    - Sortable, filterable table

  Deliverable: Full historical analytics available after each tournament.

  ---
  Phase 6 — Polish & Production Readiness (Week 11)

  - Error boundaries + graceful error states
  - Loading skeletons for all async data
  - Toast notifications for all dealer actions
  - Keyboard shortcuts for dealer panel
  - Responsive audit (tablet landscape + desktop)
  - Performance audit (Lighthouse PWA + Performance)
  - Security audit: RLS policy review, Edge Function auth hardening
  - End-to-end test with real tournament simulation

  Deliverable: Production-ready v1.0.

  ---
  Phase 7 — Future: Computer Vision Engine (Post-v1)

  - Separate Python service (FastAPI + OpenCV)
  - Camera feed analysis: hand detection, chip counting
  - Event emitter → Supabase REST API (authenticated service key)
  - CV events stored in tournament_logs with source='cv'
  - Slevin UI: CV event feed panel in dealer view
  - This is fully decoupled from v1 by design — the event log schema already supports it

  ---
  13. Key Architectural Decisions

  ┌──────────────────────┬─────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
  │       Decision       │                   Choice                    │                        Reason                        │
  ├──────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Bounty math location │ Supabase Edge Function                      │ Prevents client-side manipulation, ensures atomicity │
  ├──────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Real-time transport  │ Supabase Realtime                           │ Already in stack, zero infrastructure overhead       │
  ├──────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Offline strategy     │ IndexedDB queue + Background Sync           │ Most reliable for tablet PWA use case                │
  ├──────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Voice parser         │ Deterministic rule-based                    │ No LLM latency, works offline, predictable           │
  ├──────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Timer state storage  │ Postgres (level_started_at + current_level) │ Survives page refresh, shared across clients         │
  ├──────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ Auth                 │ Supabase Auth + JWT roles + RLS             │ Defense in depth at DB level                         │
  ├──────────────────────┼─────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ CV integration       │ Decoupled external service                  │ Isolates Python dependency, future-safe              │
  └──────────────────────┴─────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

  ---
  14. Risk Register

  ┌─────────────────────────────────┬──────────────────────────────────────────────────────────────────┐
  │              Risk               │                            Mitigation                            │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Network drop during elimination │ Offline queue + optimistic UI                                    │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Double-tap elimination          │ Server-side idempotency key per action                           │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Bounty calculation drift        │ Single Edge Function, never trust client values                  │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Voice misparse                  │ Always require explicit confirmation before dispatch             │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Timer desync across clients     │ Server timestamp as source of truth, client calculates remaining │
  ├─────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Data loss on browser crash      │ All events logged to Supabase before UI acknowledgement          │
  └─────────────────────────────────┴──────────────────────────────────────────────────────────────────┘

  ---
  This architecture gives you a clean path from Phase 1 MVP to a fully-featured platform, with the CV engine slot pre-designed so it plugs in without touching core modules. Ready to move into implementation when you are.