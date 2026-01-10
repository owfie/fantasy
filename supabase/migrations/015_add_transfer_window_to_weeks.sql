-- Migration: Add transfer window fields to weeks table
-- This migration adds:
-- 1. transfer_window_open boolean flag (admin-controlled)
-- 2. transfer_cutoff_time timestamp (when transfers lock for the week)

-- ============================================
-- ADD TRANSFER WINDOW FIELDS TO WEEKS
-- ============================================
ALTER TABLE weeks 
ADD COLUMN IF NOT EXISTS transfer_window_open BOOLEAN DEFAULT FALSE;

ALTER TABLE weeks 
ADD COLUMN IF NOT EXISTS transfer_cutoff_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_weeks_transfer_window ON weeks(transfer_window_open);
CREATE INDEX IF NOT EXISTS idx_weeks_cutoff_time ON weeks(transfer_cutoff_time);

-- Add comment for clarity
COMMENT ON COLUMN weeks.transfer_window_open IS 'Admin-controlled flag to open/close transfer window for this week';
COMMENT ON COLUMN weeks.transfer_cutoff_time IS 'Timestamp before first game when transfers lock for this week';

