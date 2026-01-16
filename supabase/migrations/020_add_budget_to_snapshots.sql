-- Add budget_remaining column to fantasy_team_snapshots
-- This tracks the remaining budget at the time of snapshot creation
-- Week 1: budget = 550 - sum of player values
-- Week 2+: budget = previous_budget + transfer_delta (sell - buy at current prices)

ALTER TABLE fantasy_team_snapshots
ADD COLUMN budget_remaining DECIMAL(10, 2) DEFAULT 0;

-- Add a comment to explain the column
COMMENT ON COLUMN fantasy_team_snapshots.budget_remaining IS
  'Remaining budget at snapshot time. Week 1 = 550 - team cost. Week 2+ = prev_budget + transfer_delta.';

-- Backfill existing snapshots with calculated budget
-- For existing snapshots, we calculate: 550 - sum of player_value_at_snapshot
UPDATE fantasy_team_snapshots s
SET budget_remaining = 550 - COALESCE(
  (SELECT SUM(player_value_at_snapshot)
   FROM fantasy_team_snapshot_players sp
   WHERE sp.snapshot_id = s.id),
  0
);
