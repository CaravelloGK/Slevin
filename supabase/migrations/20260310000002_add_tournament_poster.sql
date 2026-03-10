-- Add poster_url to tournaments for Steam-style library cards

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS poster_url text;
