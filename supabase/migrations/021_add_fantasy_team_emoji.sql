-- Add emoji column to fantasy_teams table
-- This allows users to set a custom emoji for their fantasy team

ALTER TABLE fantasy_teams
ADD COLUMN emoji TEXT DEFAULT '🏆';

-- Add a comment explaining the column
COMMENT ON COLUMN fantasy_teams.emoji IS 'Custom emoji displayed for the fantasy team. Defaults to trophy emoji.';


