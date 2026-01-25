-- Migration: Add fantasy analysis views
-- This migration creates views for analyzing fantasy team data including:
-- 1. Captain selections per team per week
-- 2. Captain popularity rankings
-- 3. Player ownership statistics
-- 4. Transfer-in events (computed from snapshot diffs)
-- 5. Transfer-out events (computed from snapshot diffs)
-- 6. Transfer summary statistics per week

-- ============================================
-- 1. CAPTAIN SELECTIONS VIEW
-- Shows captain per team per week
-- ============================================
CREATE OR REPLACE VIEW v_captain_selections AS
SELECT
  fts.id AS snapshot_id,
  fts.fantasy_team_id,
  ft.name AS team_name,
  up.display_name AS owner_name,
  fts.week_id,
  w.week_number,
  fts.captain_player_id AS player_id,
  p.first_name || ' ' || p.last_name AS captain_name,
  p.position AS captain_position
FROM fantasy_team_snapshots fts
JOIN fantasy_teams ft ON fts.fantasy_team_id = ft.id
JOIN user_profiles up ON ft.owner_id = up.id
JOIN weeks w ON fts.week_id = w.id
LEFT JOIN players p ON fts.captain_player_id = p.id;

-- ============================================
-- 2. CAPTAIN POPULARITY VIEW
-- Shows captain counts and percentages per week
-- ============================================
CREATE OR REPLACE VIEW v_captain_popularity AS
SELECT
  w.id AS week_id,
  w.week_number,
  p.id AS player_id,
  p.first_name || ' ' || p.last_name AS player_name,
  p.position,
  COUNT(DISTINCT fts.fantasy_team_id) AS captain_count,
  ROUND(
    COUNT(DISTINCT fts.fantasy_team_id) * 100.0 /
    NULLIF((SELECT COUNT(*) FROM fantasy_team_snapshots fts2 WHERE fts2.week_id = w.id), 0),
    1
  ) AS captain_percentage
FROM fantasy_team_snapshots fts
JOIN weeks w ON fts.week_id = w.id
JOIN players p ON fts.captain_player_id = p.id
GROUP BY w.id, w.week_number, p.id, p.first_name, p.last_name, p.position;

-- ============================================
-- 3. PLAYER OWNERSHIP VIEW
-- Shows ownership counts and percentages per player per week
-- ============================================
CREATE OR REPLACE VIEW v_player_ownership AS
SELECT
  w.id AS week_id,
  w.week_number,
  p.id AS player_id,
  p.first_name || ' ' || p.last_name AS player_name,
  p.position,
  COUNT(DISTINCT fts.fantasy_team_id) AS team_count,
  ROUND(
    COUNT(DISTINCT fts.fantasy_team_id) * 100.0 /
    NULLIF((SELECT COUNT(*) FROM fantasy_team_snapshots fts2 WHERE fts2.week_id = w.id), 0),
    1
  ) AS ownership_percentage
FROM fantasy_team_snapshot_players ftsp
JOIN fantasy_team_snapshots fts ON ftsp.snapshot_id = fts.id
JOIN weeks w ON fts.week_id = w.id
JOIN players p ON ftsp.player_id = p.id
GROUP BY w.id, w.week_number, p.id, p.first_name, p.last_name, p.position;

-- ============================================
-- 4. TRANSFERS IN VIEW
-- Shows all transfer-in events (player appeared on team but wasn't there previous week)
-- Computed from snapshot diffs - player in week N but not in week N-1
-- ============================================
CREATE OR REPLACE VIEW v_transfers_in AS
SELECT
  ft.id AS team_id,
  ft.name AS team_name,
  up.display_name AS owner_name,
  p.id AS player_id,
  p.first_name || ' ' || p.last_name AS player_name,
  p.position,
  w_new.id AS week_id,
  w_new.week_number AS transferred_in_week
FROM fantasy_team_snapshot_players ftsp_new
JOIN fantasy_team_snapshots fts_new ON ftsp_new.snapshot_id = fts_new.id
JOIN fantasy_teams ft ON fts_new.fantasy_team_id = ft.id
JOIN user_profiles up ON ft.owner_id = up.id
JOIN weeks w_new ON fts_new.week_id = w_new.id
JOIN players p ON ftsp_new.player_id = p.id
WHERE w_new.week_number > 1  -- Exclude week 1 (initial draft)
  AND NOT EXISTS (
    -- Player was NOT on this team in the previous week
    SELECT 1
    FROM fantasy_team_snapshot_players ftsp_prev
    JOIN fantasy_team_snapshots fts_prev ON ftsp_prev.snapshot_id = fts_prev.id
    JOIN weeks w_prev ON fts_prev.week_id = w_prev.id
    WHERE fts_prev.fantasy_team_id = ft.id
      AND ftsp_prev.player_id = ftsp_new.player_id
      AND w_prev.week_number = w_new.week_number - 1
  );

-- ============================================
-- 5. TRANSFERS OUT VIEW
-- Shows all transfer-out events (player was on team but isn't there next week)
-- Computed from snapshot diffs - player in week N but not in week N+1
-- ============================================
CREATE OR REPLACE VIEW v_transfers_out AS
SELECT
  ft.id AS team_id,
  ft.name AS team_name,
  up.display_name AS owner_name,
  p.id AS player_id,
  p.first_name || ' ' || p.last_name AS player_name,
  p.position,
  w_old.id AS last_week_id,
  w_old.week_number AS last_week_on_team,
  w_old.week_number + 1 AS transferred_out_week
FROM fantasy_team_snapshot_players ftsp_old
JOIN fantasy_team_snapshots fts_old ON ftsp_old.snapshot_id = fts_old.id
JOIN fantasy_teams ft ON fts_old.fantasy_team_id = ft.id
JOIN user_profiles up ON ft.owner_id = up.id
JOIN weeks w_old ON fts_old.week_id = w_old.id
JOIN players p ON ftsp_old.player_id = p.id
WHERE NOT EXISTS (
    -- Player is NOT on this team in the next week
    SELECT 1
    FROM fantasy_team_snapshot_players ftsp_next
    JOIN fantasy_team_snapshots fts_next ON ftsp_next.snapshot_id = fts_next.id
    JOIN weeks w_next ON fts_next.week_id = w_next.id
    WHERE fts_next.fantasy_team_id = ft.id
      AND ftsp_next.player_id = ftsp_old.player_id
      AND w_next.week_number = w_old.week_number + 1
  )
  AND EXISTS (
    -- Ensure there's a next week snapshot for this team (not just end of season)
    SELECT 1
    FROM fantasy_team_snapshots fts_next
    JOIN weeks w_next ON fts_next.week_id = w_next.id
    WHERE fts_next.fantasy_team_id = ft.id
      AND w_next.week_number = w_old.week_number + 1
  );

-- ============================================
-- 6. TRANSFER SUMMARY VIEW
-- Shows aggregate transfer statistics per week
-- ============================================
CREATE OR REPLACE VIEW v_transfer_summary AS
WITH transfers_in_counts AS (
  SELECT
    w_new.id AS week_id,
    w_new.week_number,
    COUNT(*) AS transfers_in_count
  FROM fantasy_team_snapshot_players ftsp_new
  JOIN fantasy_team_snapshots fts_new ON ftsp_new.snapshot_id = fts_new.id
  JOIN weeks w_new ON fts_new.week_id = w_new.id
  WHERE w_new.week_number > 1
    AND NOT EXISTS (
      SELECT 1
      FROM fantasy_team_snapshot_players ftsp_prev
      JOIN fantasy_team_snapshots fts_prev ON ftsp_prev.snapshot_id = fts_prev.id
      JOIN weeks w_prev ON fts_prev.week_id = w_prev.id
      WHERE fts_prev.fantasy_team_id = fts_new.fantasy_team_id
        AND ftsp_prev.player_id = ftsp_new.player_id
        AND w_prev.week_number = w_new.week_number - 1
    )
  GROUP BY w_new.id, w_new.week_number
),
transfers_out_counts AS (
  SELECT
    w_old.week_number + 1 AS week_number,
    COUNT(*) AS transfers_out_count
  FROM fantasy_team_snapshot_players ftsp_old
  JOIN fantasy_team_snapshots fts_old ON ftsp_old.snapshot_id = fts_old.id
  JOIN weeks w_old ON fts_old.week_id = w_old.id
  WHERE NOT EXISTS (
      SELECT 1
      FROM fantasy_team_snapshot_players ftsp_next
      JOIN fantasy_team_snapshots fts_next ON ftsp_next.snapshot_id = fts_next.id
      JOIN weeks w_next ON fts_next.week_id = w_next.id
      WHERE fts_next.fantasy_team_id = fts_old.fantasy_team_id
        AND ftsp_next.player_id = ftsp_old.player_id
        AND w_next.week_number = w_old.week_number + 1
    )
    AND EXISTS (
      SELECT 1
      FROM fantasy_team_snapshots fts_next
      JOIN weeks w_next ON fts_next.week_id = w_next.id
      WHERE fts_next.fantasy_team_id = fts_old.fantasy_team_id
        AND w_next.week_number = w_old.week_number + 1
    )
  GROUP BY w_old.week_number
),
team_counts AS (
  SELECT
    w.id AS week_id,
    w.week_number,
    COUNT(DISTINCT fts.fantasy_team_id) AS team_count
  FROM fantasy_team_snapshots fts
  JOIN weeks w ON fts.week_id = w.id
  GROUP BY w.id, w.week_number
)
SELECT
  tc.week_id,
  tc.week_number,
  tc.team_count AS total_teams,
  COALESCE(ti.transfers_in_count, 0) AS transfers_in,
  COALESCE(toc.transfers_out_count, 0) AS transfers_out,
  ROUND(COALESCE(ti.transfers_in_count, 0)::DECIMAL / NULLIF(tc.team_count, 0), 2) AS avg_transfers_per_team
FROM team_counts tc
LEFT JOIN transfers_in_counts ti ON tc.week_number = ti.week_number
LEFT JOIN transfers_out_counts toc ON tc.week_number = toc.week_number
ORDER BY tc.week_number;

-- ============================================
-- GRANT SELECT ON VIEWS
-- Allow authenticated users to query these views
-- ============================================
GRANT SELECT ON v_captain_selections TO authenticated;
GRANT SELECT ON v_captain_popularity TO authenticated;
GRANT SELECT ON v_player_ownership TO authenticated;
GRANT SELECT ON v_transfers_in TO authenticated;
GRANT SELECT ON v_transfers_out TO authenticated;
GRANT SELECT ON v_transfer_summary TO authenticated;

-- Also grant to anon for public access (if needed)
GRANT SELECT ON v_captain_selections TO anon;
GRANT SELECT ON v_captain_popularity TO anon;
GRANT SELECT ON v_player_ownership TO anon;
GRANT SELECT ON v_transfers_in TO anon;
GRANT SELECT ON v_transfers_out TO anon;
GRANT SELECT ON v_transfer_summary TO anon;
