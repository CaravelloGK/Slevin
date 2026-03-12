-- Enable REPLICA IDENTITY FULL on tournament_players so that DELETE events
-- include all column values in the WAL. Without this, Supabase Realtime
-- filters (e.g. tournament_id=eq.X) cannot be evaluated for DELETE events
-- and they are silently dropped, breaking real-time unregister updates.
ALTER TABLE tournament_players REPLICA IDENTITY FULL;
