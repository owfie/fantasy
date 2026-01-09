-- Migration: Add constraint to ensure fantasy team players belong to the season
-- This ensures that when adding a player to a fantasy team, the player must be
-- registered in the season_players table for that fantasy team's season.

-- ============================================
-- 1. CREATE VALIDATION FUNCTION
-- ============================================
-- Function to check if a player is registered for the fantasy team's season
CREATE OR REPLACE FUNCTION validate_fantasy_team_player_season()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id UUID;
  v_player_exists BOOLEAN;
BEGIN
  -- Get the season_id from the fantasy team
  SELECT season_id INTO v_season_id
  FROM fantasy_teams
  WHERE id = NEW.fantasy_team_id;
  
  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'Fantasy team not found or has no season';
  END IF;
  
  -- Check if the player exists in season_players for this season
  SELECT EXISTS(
    SELECT 1 FROM season_players
    WHERE season_id = v_season_id
      AND player_id = NEW.player_id
      AND is_active = true
  ) INTO v_player_exists;
  
  IF NOT v_player_exists THEN
    RAISE EXCEPTION 'Player is not registered for this season. Please add the player to the season first.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. CREATE TRIGGER
-- ============================================
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_fantasy_team_player_season_trigger ON fantasy_team_players;

-- Create trigger to validate on INSERT
CREATE TRIGGER validate_fantasy_team_player_season_trigger
  BEFORE INSERT ON fantasy_team_players
  FOR EACH ROW
  EXECUTE FUNCTION validate_fantasy_team_player_season();

-- ============================================
-- 3. ADD HELPER FUNCTION FOR APPLICATION USE
-- ============================================
-- Function to get available players for a season (not yet on any fantasy team)
CREATE OR REPLACE FUNCTION get_available_players_for_season(p_season_id UUID)
RETURNS TABLE (
  id UUID,
  player_id UUID,
  season_id UUID,
  starting_value DECIMAL,
  is_active BOOLEAN,
  first_name TEXT,
  last_name TEXT,
  player_role TEXT,
  team_id UUID,
  team_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.player_id,
    sp.season_id,
    sp.starting_value,
    sp.is_active,
    p.first_name,
    p.last_name,
    p.player_role,
    t.id as team_id,
    t.name as team_name
  FROM season_players sp
  JOIN players p ON p.id = sp.player_id
  LEFT JOIN teams t ON t.id = sp.team_id
  WHERE sp.season_id = p_season_id
    AND sp.is_active = true
    AND sp.player_id NOT IN (
      -- Exclude players already on any fantasy team in this season
      SELECT ftp.player_id
      FROM fantasy_team_players ftp
      JOIN fantasy_teams ft ON ft.id = ftp.fantasy_team_id
      WHERE ft.season_id = p_season_id
    )
  ORDER BY sp.starting_value DESC;
END;
$$;

-- ============================================
-- 4. ADD COMMENT FOR DOCUMENTATION
-- ============================================
COMMENT ON TRIGGER validate_fantasy_team_player_season_trigger ON fantasy_team_players IS 
  'Ensures players added to fantasy teams are registered in season_players for the team''s season';

COMMENT ON FUNCTION get_available_players_for_season(UUID) IS 
  'Returns all season players not yet assigned to any fantasy team in the given season';

