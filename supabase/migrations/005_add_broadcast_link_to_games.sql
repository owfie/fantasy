-- Add broadcast_link field to games table
-- This allows optional broadcast links that can be added quickly on game day

ALTER TABLE games
ADD COLUMN IF NOT EXISTS broadcast_link TEXT;

-- Add index for potential filtering/searching by broadcast link
CREATE INDEX IF NOT EXISTS idx_games_broadcast_link ON games(broadcast_link) WHERE broadcast_link IS NOT NULL;

