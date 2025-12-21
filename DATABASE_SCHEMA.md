# Database Schema Proposal

## Requirements Summary

- **League Structure**: 7-week league (2x pool play + 1x finals, but fantasy is winner-takes-all)
- **Player Types**: Captains, Players, Marquees, Rookie Marquees, Reserves
- **User Management**: Discord/Supabase auth with admin capabilities
- **Scoring**: Manual point entry by admins
- **Roster Management**: Handle reserves and substitutions for injuries/absences

## Database vs Google Sheets Comparison

### Traditional Database (Supabase/PostgreSQL) ✅ **RECOMMENDED**

**Pros:**
- ✅ **Real-time updates**: Changes reflect immediately across all users
- ✅ **Data integrity**: Foreign keys, constraints, transactions ensure consistency
- ✅ **Scalability**: Handles concurrent users and large datasets efficiently
- ✅ **Security**: Row-level security (RLS) policies for fine-grained access control
- ✅ **API integration**: Built-in REST API and real-time subscriptions
- ✅ **Query performance**: Indexed queries, complex joins, aggregations
- ✅ **Type safety**: TypeScript types generated from schema
- ✅ **Audit trail**: Built-in timestamps, can add change tracking
- ✅ **Admin CRUD views**: Can build admin interface in Next.js
- ✅ **Backup/restore**: Automated backups and point-in-time recovery
- ✅ **Multi-user editing**: Handles concurrent edits with proper locking

**Cons:**
- ❌ Requires technical knowledge to set up initially
- ❌ Non-technical users need a UI (but we can build this)

### Google Sheets

**Pros:**
- ✅ **Non-technical access**: Easy for admins to edit directly
- ✅ **Familiar interface**: Most users know how to use spreadsheets
- ✅ **No setup**: Works immediately
- ✅ **Collaboration**: Built-in sharing and comments

**Cons:**
- ❌ **No real-time sync**: Requires refresh to see updates
- ❌ **Data integrity issues**: Easy to break relationships, duplicate data
- ❌ **Limited scalability**: Slow with many users/rows
- ❌ **No proper relationships**: Foreign keys are manual and error-prone
- ❌ **Concurrent editing conflicts**: Multiple users editing can cause data loss
- ❌ **No API**: Would need Google Sheets API (rate limits, complexity)
- ❌ **Security**: Hard to implement fine-grained permissions
- ❌ **No transactions**: Can't rollback changes
- ❌ **Performance**: Slow queries, no indexing

### Recommendation

**Use Supabase/PostgreSQL** and build a simple admin CRUD interface for non-technical users. This gives us:
- Best of both worlds: database integrity + user-friendly admin UI
- Better long-term maintainability
- Can still export to CSV/Excel if needed for external analysis

---

## Database Schema Design

### Core Tables

#### 1. `users` (Supabase Auth - already exists)
- Managed by Supabase Auth
- Contains: `id` (UUID), `email`, `created_at`, etc.
- We'll reference this for fantasy team owners and admins

#### 2. `user_profiles`
Extends Supabase auth users with fantasy-specific data.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin user (you)
INSERT INTO user_profiles (id, email, display_name, is_admin)
VALUES ('2eb0941a-b6bf-418a-a711-4db9426f5161', '0xalfie@gmail.com', 'Admin', TRUE);
```

#### 3. `teams`
Real-world teams (Force, Flyers, Riptide, Titans).

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT, -- Team color (from FantasyApplication)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `players`
Individual players in the league.

```sql
CREATE TABLE players (
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
CREATE INDEX idx_players_draft_order ON players(draft_order);
CREATE INDEX idx_players_starting_value ON players(starting_value);
```

#### 5. `seasons`
Represents a league season (e.g., "2024 Season").

```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. `weeks`
Weeks within a season (7 weeks total).

```sql
CREATE TABLE weeks (
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
```

#### 7. `games`
Individual games between teams.

```sql
CREATE TABLE games (
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
```

#### 8. `fantasy_teams`
User's fantasy teams.

```sql
CREATE TABLE fantasy_teams (
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
```

#### 9. `fantasy_team_players`
Junction table: players on fantasy teams.

```sql
CREATE TABLE fantasy_team_players (
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
```

#### 10. `player_stats`
Individual player performance stats per game (manually entered by admins).

```sql
CREATE TABLE player_stats (
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
```

#### 11. `fantasy_team_scores`
Weekly scores for fantasy teams (calculated from active players).

```sql
CREATE TABLE fantasy_team_scores (
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
```

#### 12. `roster_changes`
Track when reserves are substituted in/out.

```sql
CREATE TABLE roster_changes (
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
```

#### 13. `player_availability`
Track player availability for games (for UX to help with roster decisions).

```sql
CREATE TABLE player_availability (
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
```

#### 14. `transfers` (from FantasyApplication)
Track player transfers between fantasy teams.

```sql
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  player_in_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_out_id UUID REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL, -- Week/round when transfer occurred
  net_transfer_value DECIMAL(10, 2) DEFAULT 0, -- Net cost of transfer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfers_fantasy_team ON transfers(fantasy_team_id);
CREATE INDEX idx_transfers_round ON transfers(round);
```

#### 15. `value_changes` (from FantasyApplication)
Track player value changes by round.

```sql
CREATE TABLE value_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL, -- Week/round when value changed
  value DECIMAL(10, 2) NOT NULL, -- New value for this round
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, round)
);

CREATE INDEX idx_value_changes_player ON value_changes(player_id);
CREATE INDEX idx_value_changes_round ON value_changes(round);
```

### Row Level Security (RLS) Policies

```sql
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

-- Public read access for teams, players, games, seasons, weeks
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Seasons are viewable by everyone" ON seasons FOR SELECT USING (true);
CREATE POLICY "Weeks are viewable by everyone" ON weeks FOR SELECT USING (true);
CREATE POLICY "Player stats are viewable by everyone" ON player_stats FOR SELECT USING (true);
CREATE POLICY "Fantasy team scores are viewable by everyone" ON fantasy_team_scores FOR SELECT USING (true);
CREATE POLICY "Player availability is viewable by everyone" ON player_availability FOR SELECT USING (true);

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

-- Admins can do everything
CREATE POLICY "Admins can do everything on teams" ON teams FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can do everything on players" ON players FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can do everything on games" ON games FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can do everything on player_stats" ON player_stats FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can do everything on seasons" ON seasons FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can do everything on weeks" ON weeks FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can view all fantasy teams" ON fantasy_teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
```

### Helper Functions

```sql
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
```

### Sample Data Migration

Based on `test-players.json`:

```sql
-- Insert teams
INSERT INTO teams (name) VALUES 
  ('Force'),
  ('Flyers'),
  ('Riptide'),
  ('Titans');

-- Insert players (example for Force team)
INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Andy', 'Badics', 'player'
FROM teams t WHERE t.name = 'Force'
UNION ALL
SELECT t.id, 'Brayan', 'Ordonez', 'player'
FROM teams t WHERE t.name = 'Force'
-- ... continue for all players
;
```

## Next Steps

1. **Create migration file** in Supabase SQL editor
2. **Set up RLS policies** for security
3. **Build admin CRUD interface** for:
   - Managing players and teams
   - Entering player stats
   - Viewing/managing fantasy teams
4. **Build user interface** for:
   - Drafting players
   - Managing rosters
   - Viewing scores and standings
5. **Import test data** from `test-players.json`

