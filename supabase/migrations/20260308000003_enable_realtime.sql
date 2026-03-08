-- Migration: enable Realtime on core tables
-- Without this, postgres_changes subscriptions never fire.

ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_players;
