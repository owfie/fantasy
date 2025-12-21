-- Initial Database Schema for Super League Fantasy
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. USER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert admin user
INSERT INTO user_profiles (id, email, display_name, is_admin)
VALUES ('2eb0941a-b6bf-418a-a711-4db9426f5161', '0xalfie@gmail.com', 'Admin', TRUE)
ON CONFLICT (id) DO UPDATE SET is_admin = TRUE;

-- ============================================
-- 2. TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT, -- Team color (from FantasyApplication)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PLAYERS
-- ============================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  player_role TEXT NOT NULL CHECK (player_role IN ('captain', 'player', 'marquee', 'rookie_marquee', 'reserve')),
  starting_value DECIMAL(10, 2) DEFAULT 0, -- Initial draft value (from FantasyApplication)
  draft_order INTEGER, -- Draft order/position (from FantasyApplication)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_role ON players(player_role);
CREATE INDEX idx_players_active ON players(is_active);
CREATE INDEX idx_players_draft_order ON players(draft_order);
CREATE INDEX idx_players_starting_value ON players(starting_value);

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. SEASONS
-- ============================================
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. WEEKS
-- ============================================
CREATE TABLE IF NOT EXISTS weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 7),
  name TEXT, -- e.g., "Week 1 - Pool Play", "Finals"
  start_date DATE,
  end_date DATE,
  is_draft_week BOOLEAN DEFAULT FALSE, -- Week 0 for draft
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, week_number)
);

CREATE INDEX idx_weeks_season ON weeks(season_id);
CREATE INDEX idx_weeks_number ON weeks(week_number);

-- ============================================
-- 6. GAMES
-- ============================================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_week ON games(week_id);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
CREATE INDEX idx_games_completed ON games(is_completed);

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. FANTASY TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_value DECIMAL(10, 2) DEFAULT 0, -- Original draft value (from FantasyApplication)
  total_value DECIMAL(10, 2) DEFAULT 0, -- Current total value
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fantasy_teams_owner ON fantasy_teams(owner_id);
CREATE INDEX idx_fantasy_teams_season ON fantasy_teams(season_id);

CREATE TRIGGER update_fantasy_teams_updated_at
  BEFORE UPDATE ON fantasy_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. FANTASY TEAM PLAYERS
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  draft_round INTEGER, -- Round they were drafted
  draft_pick INTEGER, -- Overall pick number
  is_captain BOOLEAN DEFAULT FALSE, -- Fantasy team captain
  is_reserve BOOLEAN DEFAULT FALSE, -- Reserve player
  is_active BOOLEAN DEFAULT TRUE, -- Currently in active lineup
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fantasy_team_id, player_id)
);

CREATE INDEX idx_ftp_fantasy_team ON fantasy_team_players(fantasy_team_id);
CREATE INDEX idx_ftp_player ON fantasy_team_players(player_id);
CREATE INDEX idx_ftp_active ON fantasy_team_players(fantasy_team_id, is_active);

-- ============================================
-- 9. PLAYER STATS
-- ============================================
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  drops INTEGER DEFAULT 0,
  throwaways INTEGER DEFAULT 0,
  points INTEGER GENERATED ALWAYS AS (goals + (assists * 2) + (blocks * 3) - drops - throwaways) STORED,
  played BOOLEAN DEFAULT TRUE, -- Did they actually play?
  entered_by UUID REFERENCES user_profiles(id), -- Admin who entered stats
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, game_id)
);

CREATE INDEX idx_player_stats_player ON player_stats(player_id);
CREATE INDEX idx_player_stats_game ON player_stats(game_id);
CREATE INDEX idx_player_stats_points ON player_stats(points);

CREATE TRIGGER update_player_stats_updated_at
  BEFORE UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. FANTASY TEAM SCORES
-- ============================================
CREATE TABLE IF NOT EXISTS fantasy_team_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  total_points DECIMAL(10, 2) DEFAULT 0,
  captain_points DECIMAL(10, 2) DEFAULT 0, -- Captain gets double points
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fantasy_team_id, week_id)
);

CREATE INDEX idx_fts_fantasy_team ON fantasy_team_scores(fantasy_team_id);
CREATE INDEX idx_fts_week ON fantasy_team_scores(week_id);

-- ============================================
-- 11. ROSTER CHANGES
-- ============================================
CREATE TABLE IF NOT EXISTS roster_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  player_out_id UUID REFERENCES players(id) ON DELETE CASCADE, -- Player being replaced
  player_in_id UUID REFERENCES players(id) ON DELETE CASCADE, -- Reserve coming in
  reason TEXT, -- 'injury', 'absence', 'other'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_roster_changes_team ON roster_changes(fantasy_team_id);
CREATE INDEX idx_roster_changes_week ON roster_changes(week_id);

-- ============================================
-- 12. PLAYER AVAILABILITY
-- ============================================
CREATE TABLE IF NOT EXISTS player_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'unsure')),
  confirmed_by UUID REFERENCES user_profiles(id), -- Player or admin who confirmed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, game_id)
);

CREATE INDEX idx_availability_player ON player_availability(player_id);
CREATE INDEX idx_availability_game ON player_availability(game_id);

CREATE TRIGGER update_player_availability_updated_at
  BEFORE UPDATE ON player_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. TRANSFERS (from FantasyApplication)
-- ============================================
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  player_in_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_out_id UUID REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL, -- Week/round when transfer occurred
  net_transfer_value DECIMAL(10, 2) DEFAULT 0, -- Net cost of transfer (from FantasyApplication)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfers_fantasy_team ON transfers(fantasy_team_id);
CREATE INDEX idx_transfers_round ON transfers(round);
CREATE INDEX idx_transfers_players ON transfers(player_in_id, player_out_id);

-- ============================================
-- 14. VALUE CHANGES (from FantasyApplication)
-- ============================================
CREATE TABLE IF NOT EXISTS value_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL, -- Week/round when value changed
  value DECIMAL(10, 2) NOT NULL, -- New value for this round (from FantasyApplication)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, round)
);

CREATE INDEX idx_value_changes_player ON value_changes(player_id);
CREATE INDEX idx_value_changes_round ON value_changes(round);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_changes ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public read access for teams, players, games, seasons, weeks
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Seasons are viewable by everyone" ON seasons FOR SELECT USING (true);
CREATE POLICY "Weeks are viewable by everyone" ON weeks FOR SELECT USING (true);
CREATE POLICY "Player stats are viewable by everyone" ON player_stats FOR SELECT USING (true);
CREATE POLICY "Fantasy team scores are viewable by everyone" ON fantasy_team_scores FOR SELECT USING (true);
CREATE POLICY "Player availability is viewable by everyone" ON player_availability FOR SELECT USING (true);
CREATE POLICY "Transfers are viewable by everyone" ON transfers FOR SELECT USING (true);
CREATE POLICY "Value changes are viewable by everyone" ON value_changes FOR SELECT USING (true);

-- Users can only see their own fantasy teams
CREATE POLICY "Users can view own fantasy teams" ON fantasy_teams FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own fantasy teams" ON fantasy_teams FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own fantasy teams" ON fantasy_teams FOR UPDATE USING (auth.uid() = owner_id);

-- Users can manage players on their own teams
CREATE POLICY "Users can manage players on own teams" ON fantasy_team_players FOR ALL USING (
  EXISTS (SELECT 1 FROM fantasy_teams WHERE id = fantasy_team_players.fantasy_team_id AND owner_id = auth.uid())
);

-- Users can manage their own roster changes
CREATE POLICY "Users can manage own roster changes" ON roster_changes FOR ALL USING (
  EXISTS (SELECT 1 FROM fantasy_teams WHERE id = roster_changes.fantasy_team_id AND owner_id = auth.uid())
);

-- Users can manage their own transfers
CREATE POLICY "Users can manage own transfers" ON transfers FOR ALL USING (
  EXISTS (SELECT 1 FROM fantasy_teams WHERE id = transfers.fantasy_team_id AND owner_id = auth.uid())
);

-- Admins can do everything
CREATE POLICY "Admins can do everything on teams" ON teams FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can do everything on players" ON players FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can do everything on games" ON games FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can do everything on player_stats" ON player_stats FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can do everything on seasons" ON seasons FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can do everything on weeks" ON weeks FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can view all fantasy teams" ON fantasy_teams FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage all fantasy teams" ON fantasy_teams FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can do everything on transfers" ON transfers FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can do everything on value_changes" ON value_changes FOR ALL USING (is_admin(auth.uid()));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate fantasy team score for a week
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
  FROM fantasy_team_players ftp
  JOIN player_stats ps ON ps.player_id = ftp.player_id
  JOIN games g ON g.id = ps.game_id
  WHERE ftp.fantasy_team_id = p_fantasy_team_id
    AND g.week_id = p_week_id
    AND ftp.is_active = TRUE
    AND ftp.is_reserve = FALSE
    AND ftp.is_captain = FALSE;

  -- Add captain points (double)
  SELECT COALESCE(SUM(ps.points * 2), 0)
  INTO v_captain_points
  FROM fantasy_team_players ftp
  JOIN player_stats ps ON ps.player_id = ftp.player_id
  JOIN games g ON g.id = ps.game_id
  WHERE ftp.fantasy_team_id = p_fantasy_team_id
    AND g.week_id = p_week_id
    AND ftp.is_active = TRUE
    AND ftp.is_captain = TRUE;

  RETURN v_total_points + v_captain_points;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update fantasy team scores when stats change
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
$$ LANGUAGE plpgsql;

-- Trigger to auto-update scores when stats are inserted/updated
CREATE TRIGGER trigger_update_fantasy_scores
  AFTER INSERT OR UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_fantasy_team_scores();

