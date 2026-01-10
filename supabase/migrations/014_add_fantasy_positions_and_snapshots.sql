-- Migration: Add fantasy positions and snapshot tables
-- This migration adds:
-- 1. Position field to players table (handler/cutter/receiver)
-- 2. Fantasy team snapshots table (immutable weekly snapshots)
-- 3. Fantasy team snapshot players table (players in each snapshot)

-- ============================================
-- 1. ADD POSITION TO PLAYERS
-- ============================================
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS position TEXT CHECK (position IN ('handler', 'cutter', 'receiver'));

CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);

-- ============================================
-- 2. FANTASY TEAM SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_team_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  captain_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  total_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  snapshot_created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fantasy_team_id, week_id)
);

CREATE INDEX idx_snapshots_fantasy_team ON fantasy_team_snapshots(fantasy_team_id);
CREATE INDEX idx_snapshots_week ON fantasy_team_snapshots(week_id);
CREATE INDEX idx_snapshots_created_at ON fantasy_team_snapshots(snapshot_created_at);

-- ============================================
-- 3. FANTASY TEAM SNAPSHOT PLAYERS
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_team_snapshot_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES fantasy_team_snapshots(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (position IN ('handler', 'cutter', 'receiver')),
  is_benched BOOLEAN DEFAULT FALSE,
  is_captain BOOLEAN DEFAULT FALSE,
  player_value_at_snapshot DECIMAL(10, 2) NOT NULL DEFAULT 0,
  UNIQUE(snapshot_id, player_id)
);

CREATE INDEX idx_snapshot_players_snapshot ON fantasy_team_snapshot_players(snapshot_id);
CREATE INDEX idx_snapshot_players_player ON fantasy_team_snapshot_players(player_id);
CREATE INDEX idx_snapshot_players_position ON fantasy_team_snapshot_players(position);
CREATE INDEX idx_snapshot_players_benched ON fantasy_team_snapshot_players(is_benched);

-- ============================================
-- 4. UPDATE TRANSFERS TABLE
-- ============================================
-- Add week_id column (keeping round for backward compatibility during migration)
ALTER TABLE transfers 
ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES weeks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transfers_week ON transfers(week_id);

-- Add constraint to limit transfers per week (max 2 per fantasy_team_id per week_id)
-- Note: This will be enforced at application level, but we can add a check constraint
-- We'll use a function to validate this

-- Function to check transfer count
CREATE OR REPLACE FUNCTION check_transfer_limit()
RETURNS TRIGGER AS $$
DECLARE
  transfer_count INTEGER;
BEGIN
  -- Count existing transfers for this team and week
  SELECT COUNT(*) INTO transfer_count
  FROM transfers
  WHERE fantasy_team_id = NEW.fantasy_team_id
    AND week_id = NEW.week_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  -- Allow unlimited transfers if week_id is NULL (backward compatibility)
  -- Otherwise limit to 2
  IF NEW.week_id IS NOT NULL AND transfer_count >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 transfers allowed per week for this fantasy team';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce transfer limit
DROP TRIGGER IF EXISTS enforce_transfer_limit ON transfers;
CREATE TRIGGER enforce_transfer_limit
  BEFORE INSERT OR UPDATE ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION check_transfer_limit();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE fantasy_team_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_snapshot_players ENABLE ROW LEVEL SECURITY;

-- Snapshots are viewable by everyone
CREATE POLICY "Snapshots are viewable by everyone" ON fantasy_team_snapshots 
  FOR SELECT USING (true);

-- Snapshot players are viewable by everyone
CREATE POLICY "Snapshot players are viewable by everyone" ON fantasy_team_snapshot_players 
  FOR SELECT USING (true);

-- Users can manage snapshots for their own teams
CREATE POLICY "Users can manage own snapshots" ON fantasy_team_snapshots 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE id = fantasy_team_snapshots.fantasy_team_id 
      AND owner_id = auth.uid()
    )
  );

-- Users can manage snapshot players for their own teams
CREATE POLICY "Users can manage own snapshot players" ON fantasy_team_snapshot_players 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fantasy_team_snapshots fts
      JOIN fantasy_teams ft ON ft.id = fts.fantasy_team_id
      WHERE fts.id = fantasy_team_snapshot_players.snapshot_id
      AND ft.owner_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can do everything on snapshots" ON fantasy_team_snapshots 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can do everything on snapshot players" ON fantasy_team_snapshot_players 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Update transfers RLS to handle week_id
-- The existing policies should still work, but we may need to update them
-- For now, keep existing policies and they'll work with week_id

