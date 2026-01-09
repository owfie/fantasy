-- Migration: Add team_id to season_players
-- This allows tracking which team a player played for in each season
-- A player might play for Team X in 2018 and Team Y in 2019

-- Add team_id column to season_players
ALTER TABLE season_players
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Create index for efficient lookups by team
CREATE INDEX idx_season_players_team ON season_players(team_id);

-- Add a comment explaining the relationship
COMMENT ON COLUMN season_players.team_id IS 'The team the player played for during this season. Allows historical tracking of player team assignments.';

