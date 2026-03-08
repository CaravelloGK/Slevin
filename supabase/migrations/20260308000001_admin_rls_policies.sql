-- Migration: RLS policies for admin and dealer operations
-- Admin role is stored in auth.jwt() -> 'user_metadata' ->> 'role'

-- ============================================================
-- Helper: role check expressions
-- (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
-- (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer')
-- ============================================================

-- ---- blind_structures -------------------------------------------------------

DROP POLICY IF EXISTS "admins_select_blind_structures"  ON blind_structures;
DROP POLICY IF EXISTS "admins_insert_blind_structures"  ON blind_structures;
DROP POLICY IF EXISTS "admins_update_blind_structures"  ON blind_structures;
DROP POLICY IF EXISTS "admins_delete_blind_structures"  ON blind_structures;
DROP POLICY IF EXISTS "authenticated_select_blind_structures" ON blind_structures;

-- All authenticated users can read structures (needed for tournament creation form)
CREATE POLICY "authenticated_select_blind_structures" ON blind_structures
  FOR SELECT TO authenticated USING (true);

-- Only admins can write
CREATE POLICY "admins_insert_blind_structures" ON blind_structures
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_update_blind_structures" ON blind_structures
  FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_delete_blind_structures" ON blind_structures
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---- blind_levels -----------------------------------------------------------

DROP POLICY IF EXISTS "admins_select_blind_levels"  ON blind_levels;
DROP POLICY IF EXISTS "admins_insert_blind_levels"  ON blind_levels;
DROP POLICY IF EXISTS "admins_update_blind_levels"  ON blind_levels;
DROP POLICY IF EXISTS "admins_delete_blind_levels"  ON blind_levels;
DROP POLICY IF EXISTS "authenticated_select_blind_levels" ON blind_levels;

CREATE POLICY "authenticated_select_blind_levels" ON blind_levels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_blind_levels" ON blind_levels
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_update_blind_levels" ON blind_levels
  FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_delete_blind_levels" ON blind_levels
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---- players ----------------------------------------------------------------

DROP POLICY IF EXISTS "admins_insert_players"  ON players;
DROP POLICY IF EXISTS "admins_update_players"  ON players;
DROP POLICY IF EXISTS "admins_delete_players"  ON players;
DROP POLICY IF EXISTS "authenticated_select_players" ON players;

CREATE POLICY "authenticated_select_players" ON players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_players" ON players
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_update_players" ON players
  FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_delete_players" ON players
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---- tournaments ------------------------------------------------------------

DROP POLICY IF EXISTS "admins_insert_tournaments"   ON tournaments;
DROP POLICY IF EXISTS "admins_delete_tournaments"   ON tournaments;
DROP POLICY IF EXISTS "admins_dealers_select_tournaments" ON tournaments;
DROP POLICY IF EXISTS "admins_dealers_update_tournaments" ON tournaments;

-- Admins and dealers can read tournaments
CREATE POLICY "admins_dealers_select_tournaments" ON tournaments
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'));

-- Only admins can create/delete tournaments
CREATE POLICY "admins_insert_tournaments" ON tournaments
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_delete_tournaments" ON tournaments
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Admins and dealers can update tournaments (timer controls, status changes)
CREATE POLICY "admins_dealers_update_tournaments" ON tournaments
  FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'));

-- ---- tournament_players -----------------------------------------------------

DROP POLICY IF EXISTS "admins_insert_tournament_players"  ON tournament_players;
DROP POLICY IF EXISTS "admins_delete_tournament_players"  ON tournament_players;
DROP POLICY IF EXISTS "admins_dealers_select_tournament_players" ON tournament_players;
DROP POLICY IF EXISTS "admins_dealers_update_tournament_players" ON tournament_players;

CREATE POLICY "admins_dealers_select_tournament_players" ON tournament_players
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'));

-- Admins register/remove players (pre-tournament)
CREATE POLICY "admins_insert_tournament_players" ON tournament_players
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "admins_delete_tournament_players" ON tournament_players
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Admins and dealers can update player state (status, bounty via Edge Functions use service_role,
-- but direct dealer actions like seat assignment may use anon key)
CREATE POLICY "admins_dealers_update_tournament_players" ON tournament_players
  FOR UPDATE TO authenticated
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'));

-- ---- tournament_logs --------------------------------------------------------

DROP POLICY IF EXISTS "admins_dealers_select_tournament_logs" ON tournament_logs;
DROP POLICY IF EXISTS "admins_dealers_insert_tournament_logs" ON tournament_logs;

CREATE POLICY "admins_dealers_select_tournament_logs" ON tournament_logs
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'));

CREATE POLICY "admins_dealers_insert_tournament_logs" ON tournament_logs
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'dealer'));
