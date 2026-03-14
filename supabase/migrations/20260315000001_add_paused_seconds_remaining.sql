-- Migration: add paused_seconds_remaining to tournaments
-- Stores the exact number of seconds left when a tournament is paused.
-- The client uses this value directly instead of recomputing from level_started_at,
-- which would drift as wall-clock time advances during the pause.

alter table tournaments
  add column if not exists paused_seconds_remaining integer;
