-- Migration: Add PostgreSQL functions for fantasy score calculation
-- These functions provide optimized database-level operations

-- ============================================
-- FUNCTION: Get player value for a specific week
-- ============================================
CREATE OR REPLACE FUNCTION get_player_value_for_week(
  p_player_id UUID,
  p_week_number INTEGER,
  p_season_id UUID
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_value DECIMAL(10, 2);
BEGIN
  -- Try to find value change for this round or most recent previous round
  SELECT value INTO v_value
  FROM value_changes
  WHERE player_id = p_player_id
    AND round <= p_week_number
  ORDER BY round DESC
  LIMIT 1;

  -- If no value change found, use starting value from season_players
  IF v_value IS NULL THEN
    SELECT starting_value INTO v_value
    FROM season_players
    WHERE player_id = p_player_id
      AND season_id = p_season_id
      AND is_active = TRUE;

    -- Fallback to player's starting_value
    IF v_value IS NULL THEN
      SELECT starting_value INTO v_value
      FROM players
      WHERE id = p_player_id;
    END IF;
  END IF;

  RETURN COALESCE(v_value, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Validate fantasy lineup positions
-- ============================================
CREATE OR REPLACE FUNCTION validate_fantasy_lineup(
  p_snapshot_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_handlers_starting INTEGER;
  v_cutters_starting INTEGER;
  v_receivers_starting INTEGER;
  v_handlers_bench INTEGER;
  v_cutters_bench INTEGER;
  v_receivers_bench INTEGER;
  v_total INTEGER;
BEGIN
  -- Count starting players by position
  SELECT COUNT(*) INTO v_handlers_starting
  FROM fantasy_team_snapshot_players
  WHERE snapshot_id = p_snapshot_id
    AND position = 'handler'
    AND is_benched = FALSE;

  SELECT COUNT(*) INTO v_cutters_starting
  FROM fantasy_team_snapshot_players
  WHERE snapshot_id = p_snapshot_id
    AND position = 'cutter'
    AND is_benched = FALSE;

  SELECT COUNT(*) INTO v_receivers_starting
  FROM fantasy_team_snapshot_players
  WHERE snapshot_id = p_snapshot_id
    AND position = 'receiver'
    AND is_benched = FALSE;

  -- Count bench players by position
  SELECT COUNT(*) INTO v_handlers_bench
  FROM fantasy_team_snapshot_players
  WHERE snapshot_id = p_snapshot_id
    AND position = 'handler'
    AND is_benched = TRUE;

  SELECT COUNT(*) INTO v_cutters_bench
  FROM fantasy_team_snapshot_players
  WHERE snapshot_id = p_snapshot_id
    AND position = 'cutter'
    AND is_benched = TRUE;

  SELECT COUNT(*) INTO v_receivers_bench
  FROM fantasy_team_snapshot_players
  WHERE snapshot_id = p_snapshot_id
    AND position = 'receiver'
    AND is_benched = TRUE;

  -- Count total
  SELECT COUNT(*) INTO v_total
  FROM fantasy_team_snapshot_players
  WHERE snapshot_id = p_snapshot_id;

  -- Validate constraints
  RETURN (
    v_total = 10
    AND v_handlers_starting = 3
    AND v_cutters_starting = 2
    AND v_receivers_starting = 2
    AND v_handlers_bench = 1
    AND v_cutters_bench = 1
    AND v_receivers_bench = 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Calculate fantasy team score with auto-substitution
-- ============================================
CREATE OR REPLACE FUNCTION calculate_fantasy_team_score_with_substitution(
  p_fantasy_team_id UUID,
  p_week_id UUID
)
RETURNS TABLE(
  total_points DECIMAL(10, 2),
  captain_points DECIMAL(10, 2)
) AS $$
DECLARE
  v_snapshot_id UUID;
  v_total_points DECIMAL(10, 2) := 0;
  v_captain_points DECIMAL(10, 2) := 0;
  v_player_record RECORD;
  v_stats_record RECORD;
  v_substitute_id UUID;
  v_game_record RECORD;
BEGIN
  -- Get snapshot for this week
  SELECT id INTO v_snapshot_id
  FROM fantasy_team_snapshots
  WHERE fantasy_team_id = p_fantasy_team_id
    AND week_id = p_week_id;

  IF v_snapshot_id IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL(10, 2), 0::DECIMAL(10, 2);
    RETURN;
  END IF;

  -- Loop through starting lineup (non-benched players)
  FOR v_player_record IN
    SELECT *
    FROM fantasy_team_snapshot_players
    WHERE snapshot_id = v_snapshot_id
      AND is_benched = FALSE
  LOOP
    -- Get games for this week
    FOR v_game_record IN
      SELECT id
      FROM games
      WHERE week_id = p_week_id
    LOOP
      -- Check if player played
      SELECT * INTO v_stats_record
      FROM player_stats
      WHERE player_id = v_player_record.player_id
        AND game_id = v_game_record.id;

      -- If player didn't play, try to find substitute
      IF v_stats_record IS NULL OR (v_stats_record.played = FALSE) THEN
        -- Find benched player of same position
        SELECT player_id INTO v_substitute_id
        FROM fantasy_team_snapshot_players
        WHERE snapshot_id = v_snapshot_id
          AND position = v_player_record.position
          AND is_benched = TRUE
          AND is_captain = FALSE
        LIMIT 1;

        -- Check if substitute played
        IF v_substitute_id IS NOT NULL THEN
          SELECT * INTO v_stats_record
          FROM player_stats
          WHERE player_id = v_substitute_id
            AND game_id = v_game_record.id
            AND played = TRUE;
        END IF;
      END IF;

      -- Add points (if player or substitute played)
      IF v_stats_record IS NOT NULL AND v_stats_record.played = TRUE THEN
        IF v_player_record.is_captain THEN
          v_captain_points := v_captain_points + (v_stats_record.points * 2);
        ELSE
          v_total_points := v_total_points + v_stats_record.points;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_total_points, v_captain_points;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Recalculate scores from a week forward
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_scores_from_week(
  p_fantasy_team_id UUID,
  p_from_week_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_week_record RECORD;
  v_snapshot_id UUID;
  v_score_result RECORD;
  v_weeks_updated INTEGER := 0;
BEGIN
  -- Get the from week
  SELECT week_number, season_id INTO v_week_record
  FROM weeks
  WHERE id = p_from_week_id;

  IF v_week_record IS NULL THEN
    RAISE EXCEPTION 'Week not found';
  END IF;

  -- Get all subsequent weeks
  FOR v_week_record IN
    SELECT id, week_number
    FROM weeks
    WHERE season_id = (SELECT season_id FROM weeks WHERE id = p_from_week_id)
      AND week_number >= (SELECT week_number FROM weeks WHERE id = p_from_week_id)
    ORDER BY week_number
  LOOP
    -- Check if snapshot exists
    SELECT id INTO v_snapshot_id
    FROM fantasy_team_snapshots
    WHERE fantasy_team_id = p_fantasy_team_id
      AND week_id = v_week_record.id;

    IF v_snapshot_id IS NOT NULL THEN
      -- Calculate score
      SELECT * INTO v_score_result
      FROM calculate_fantasy_team_score_with_substitution(p_fantasy_team_id, v_week_record.id);

      -- Update or insert score
      INSERT INTO fantasy_team_scores (
        fantasy_team_id,
        week_id,
        total_points,
        captain_points
      )
      VALUES (
        p_fantasy_team_id,
        v_week_record.id,
        v_score_result.total_points + v_score_result.captain_points,
        v_score_result.captain_points
      )
      ON CONFLICT (fantasy_team_id, week_id)
      DO UPDATE SET
        total_points = v_score_result.total_points + v_score_result.captain_points,
        captain_points = v_score_result.captain_points,
        calculated_at = NOW();

      v_weeks_updated := v_weeks_updated + 1;
    END IF;
  END LOOP;

  RETURN v_weeks_updated;
END;
$$ LANGUAGE plpgsql;

