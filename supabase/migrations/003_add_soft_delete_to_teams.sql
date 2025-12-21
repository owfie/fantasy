-- Add soft delete support to teams table
-- Run this after 001_initial_schema.sql

ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON teams(deleted_at);

-- Update RLS policy to allow viewing deleted teams (for admin)
-- The existing policies already allow admins to see everything

