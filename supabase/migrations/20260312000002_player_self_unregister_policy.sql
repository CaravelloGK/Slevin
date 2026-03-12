-- Allow players to cancel their own registration while tournament is still pending.
DROP POLICY IF EXISTS "players_self_unregister" ON tournament_players;
CREATE POLICY "players_self_unregister" ON tournament_players
  FOR DELETE TO authenticated
  USING (
    -- Their own player row
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
    AND
    -- Only in pending tournaments
    tournament_id IN (
      SELECT id FROM tournaments WHERE status = 'pending'
    )
  );
