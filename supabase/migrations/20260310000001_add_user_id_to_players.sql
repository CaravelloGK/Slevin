-- Add user_id column linking players to auth users
-- Nullable: custom players (created by admin) have user_id = NULL

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_key
  ON players(user_id)
  WHERE user_id IS NOT NULL;

-- RLS: authenticated users can update only their own player row
CREATE POLICY "Players can update own profile"
  ON players
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
