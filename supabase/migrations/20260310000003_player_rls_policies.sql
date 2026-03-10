-- RLS policies for regular authenticated players

-- ---- tournaments ------------------------------------------------------------
-- Players can read all tournaments (needed for lobby, history, club pages)
DROP POLICY IF EXISTS "authenticated_select_tournaments" ON tournaments;
CREATE POLICY "authenticated_select_tournaments" ON tournaments
  FOR SELECT TO authenticated
  USING (true);

-- ---- tournament_players -----------------------------------------------------
-- Players can read tournament participants (needed for lobby page)
DROP POLICY IF EXISTS "authenticated_select_tournament_players" ON tournament_players;
CREATE POLICY "authenticated_select_tournament_players" ON tournament_players
  FOR SELECT TO authenticated
  USING (true);

-- Players can register themselves in a pending tournament
DROP POLICY IF EXISTS "players_self_register" ON tournament_players;
CREATE POLICY "players_self_register" ON tournament_players
  FOR INSERT TO authenticated
  WITH CHECK (
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

-- ---- tournament_logs --------------------------------------------------------
-- Players can read logs of tournaments they participated in (for history)
DROP POLICY IF EXISTS "players_select_own_tournament_logs" ON tournament_logs;
CREATE POLICY "players_select_own_tournament_logs" ON tournament_logs
  FOR SELECT TO authenticated
  USING (
    tournament_id IN (
      SELECT tp.tournament_id FROM tournament_players tp
      INNER JOIN players p ON p.id = tp.player_id
      WHERE p.user_id = auth.uid()
    )
  );
