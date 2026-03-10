-- Store the assigned dealer (player) for each tournament.
-- The dealer is one of the registered players whose auth account role is temporarily elevated to 'dealer'.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS dealer_player_id UUID REFERENCES players(id) ON DELETE SET NULL;
