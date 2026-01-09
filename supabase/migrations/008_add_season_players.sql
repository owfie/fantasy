-- Season Players Junction Table
-- Tracks which players are active for each season with season-specific starting values

-- ============================================
-- 1. CREATE SEASON_PLAYERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS season_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  starting_value DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- Season-specific value
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, player_id)
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================
CREATE INDEX idx_season_players_season ON season_players(season_id);
CREATE INDEX idx_season_players_player ON season_players(player_id);
CREATE INDEX idx_season_players_active ON season_players(season_id, is_active);

-- ============================================
-- 3. CREATE UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER update_season_players_updated_at
  BEFORE UPDATE ON season_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE season_players ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Season players are viewable by everyone" 
  ON season_players FOR SELECT 
  USING (true);

-- Admins can do everything
CREATE POLICY "Admins can do everything on season_players" 
  ON season_players FOR ALL 
  USING (is_admin(auth.uid()));

