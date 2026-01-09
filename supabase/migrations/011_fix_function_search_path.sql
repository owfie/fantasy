-- Fix security issue: Set search_path on functions to prevent search_path manipulation attacks
-- See: https://supabase.com/docs/guides/database/database-linter#0017_function_search_path_mutable

-- ============================================
-- 1. update_updated_at_column
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- 2. is_admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ============================================
-- 3. calculate_fantasy_team_score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_fantasy_team_score(
  p_fantasy_team_id UUID,
  p_week_id UUID
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_total_points DECIMAL(10, 2) := 0;
  v_captain_points DECIMAL(10, 2) := 0;
BEGIN
  -- Sum points from active players (non-reserves, non-captain)
  SELECT COALESCE(SUM(ps.points), 0)
  INTO v_total_points
  FROM public.fantasy_team_players ftp
  JOIN public.player_stats ps ON ps.player_id = ftp.player_id
  JOIN public.games g ON g.id = ps.game_id
  WHERE ftp.fantasy_team_id = p_fantasy_team_id
    AND g.week_id = p_week_id
    AND ftp.is_active = TRUE
    AND ftp.is_reserve = FALSE
    AND ftp.is_captain = FALSE;

  -- Add captain points (double)
  SELECT COALESCE(SUM(ps.points * 2), 0)
  INTO v_captain_points
  FROM public.fantasy_team_players ftp
  JOIN public.player_stats ps ON ps.player_id = ftp.player_id
  JOIN public.games g ON g.id = ps.game_id
  WHERE ftp.fantasy_team_id = p_fantasy_team_id
    AND g.week_id = p_week_id
    AND ftp.is_active = TRUE
    AND ftp.is_captain = TRUE;

  RETURN v_total_points + v_captain_points;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- 4. update_fantasy_team_scores
-- ============================================
CREATE OR REPLACE FUNCTION update_fantasy_team_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_week_id UUID;
  v_fantasy_team_ids UUID[];
BEGIN
  -- Get week_id from the game
  SELECT week_id INTO v_week_id FROM public.games WHERE id = NEW.game_id;
  
  -- Find all fantasy teams that have this player
  SELECT ARRAY_AGG(DISTINCT fantasy_team_id)
  INTO v_fantasy_team_ids
  FROM public.fantasy_team_players
  WHERE player_id = NEW.player_id AND is_active = TRUE;
  
  -- Update scores for each fantasy team
  IF v_fantasy_team_ids IS NOT NULL THEN
    INSERT INTO public.fantasy_team_scores (fantasy_team_id, week_id, total_points, captain_points)
    SELECT 
      ftp.fantasy_team_id,
      v_week_id,
      public.calculate_fantasy_team_score(ftp.fantasy_team_id, v_week_id),
      0 -- Captain points calculated separately
    FROM public.fantasy_team_players ftp
    WHERE ftp.fantasy_team_id = ANY(v_fantasy_team_ids)
      AND ftp.player_id = NEW.player_id
    ON CONFLICT (fantasy_team_id, week_id) 
    DO UPDATE SET 
      total_points = public.calculate_fantasy_team_score(public.fantasy_team_scores.fantasy_team_id, v_week_id),
      calculated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

