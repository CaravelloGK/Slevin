-- Add per-tournament blind level overrides column.
-- Dealers can adjust blind levels for a specific tournament without touching the original structure.
-- Format: [{ level_number, small_blind, big_blind, ante, duration_minutes }]

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS blind_level_overrides JSONB NOT NULL DEFAULT '[]'::jsonb;
