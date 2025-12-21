-- Fix RLS issue with fantasy_team_scores trigger
-- The trigger function needs SECURITY DEFINER to bypass RLS when updating scores

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_fantasy_team_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_week_id UUID;
  v_fantasy_team_ids UUID[];
BEGIN
  -- Get week_id from the game
  SELECT week_id INTO v_week_id FROM games WHERE id = NEW.game_id;
  
  -- Find all fantasy teams that have this player
  SELECT ARRAY_AGG(DISTINCT fantasy_team_id)
  INTO v_fantasy_team_ids
  FROM fantasy_team_players
  WHERE player_id = NEW.player_id AND is_active = TRUE;
  
  -- Update scores for each fantasy team
  IF v_fantasy_team_ids IS NOT NULL THEN
    INSERT INTO fantasy_team_scores (fantasy_team_id, week_id, total_points, captain_points)
    SELECT 
      ftp.fantasy_team_id,
      v_week_id,
      calculate_fantasy_team_score(ftp.fantasy_team_id, v_week_id),
      0 -- Captain points calculated separately
    FROM fantasy_team_players ftp
    WHERE ftp.fantasy_team_id = ANY(v_fantasy_team_ids)
      AND ftp.player_id = NEW.player_id
    ON CONFLICT (fantasy_team_id, week_id) 
    DO UPDATE SET 
      total_points = calculate_fantasy_team_score(fantasy_team_scores.fantasy_team_id, v_week_id),
      calculated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also add RLS policies for fantasy_team_scores to allow system updates
-- Allow admins to insert/update scores
CREATE POLICY "Admins can manage fantasy team scores" ON fantasy_team_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Note: The SECURITY DEFINER function above will bypass RLS, but having this policy
-- provides an additional layer of security for direct admin access

