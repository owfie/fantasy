-- Migration: Add prices_calculated column to weeks table
-- This enables the "Ready for Review" state before opening transfer windows

-- Add prices_calculated column with safe default
ALTER TABLE weeks
  ADD COLUMN IF NOT EXISTS prices_calculated BOOLEAN DEFAULT FALSE;

-- Backfill: Mark weeks that already have value_changes as calculated
UPDATE weeks w
SET prices_calculated = TRUE
WHERE EXISTS (
  SELECT 1 FROM value_changes vc
  WHERE vc.round = w.week_number
);

-- Constraint: Only one open window per season (partial unique index)
-- This prevents multiple windows being open simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS single_open_window_per_season
  ON weeks (season_id)
  WHERE transfer_window_open = true;

-- Add helpful comments
COMMENT ON COLUMN weeks.prices_calculated IS 'True when prices have been calculated for this transfer window (auto-set when stats are saved)';
