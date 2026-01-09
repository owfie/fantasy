-- Optimize RLS policies for better performance
-- 1. Wrap auth.uid() in subquery (select auth.uid()) to evaluate once per query instead of per row
-- 2. Split FOR ALL policies into specific INSERT/UPDATE/DELETE to avoid overlap with public SELECT policies
-- 3. Combine user/admin policies for same action to avoid multiple permissive policies
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================
-- 1. FANTASY_TEAMS POLICIES
-- ============================================
-- Combine user/admin into single policies per action to avoid overlap

DROP POLICY IF EXISTS "Users can view own fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Users can create own fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Users can update own fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Admins can view all fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Admins can manage all fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Owners or admins can view fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Owners or admins can insert fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Owners or admins can update fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Admins can delete fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Admins can insert fantasy teams" ON fantasy_teams;
DROP POLICY IF EXISTS "Admins can update fantasy teams" ON fantasy_teams;

CREATE POLICY "Owners or admins can view fantasy teams" ON fantasy_teams 
  FOR SELECT USING (
    (select auth.uid()) = owner_id 
    OR is_admin((select auth.uid()))
  );

CREATE POLICY "Owners or admins can insert fantasy teams" ON fantasy_teams 
  FOR INSERT WITH CHECK (
    (select auth.uid()) = owner_id 
    OR is_admin((select auth.uid()))
  );

CREATE POLICY "Owners or admins can update fantasy teams" ON fantasy_teams 
  FOR UPDATE USING (
    (select auth.uid()) = owner_id 
    OR is_admin((select auth.uid()))
  );

CREATE POLICY "Admins can delete fantasy teams" ON fantasy_teams 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 2. FANTASY_TEAM_PLAYERS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can manage players on own teams" ON fantasy_team_players;

CREATE POLICY "Users can manage players on own teams" ON fantasy_team_players 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE id = fantasy_team_players.fantasy_team_id 
        AND owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 3. ROSTER_CHANGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can manage own roster changes" ON roster_changes;

CREATE POLICY "Users can manage own roster changes" ON roster_changes 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE id = roster_changes.fantasy_team_id 
        AND owner_id = (select auth.uid())
    )
  );

-- ============================================
-- 4. TRANSFERS POLICIES
-- ============================================
-- Has "Transfers are viewable by everyone" - combine user/admin into single policies per action

DROP POLICY IF EXISTS "Users can manage own transfers" ON transfers;
DROP POLICY IF EXISTS "Admins can do everything on transfers" ON transfers;
DROP POLICY IF EXISTS "Owners and admins can insert transfers" ON transfers;
DROP POLICY IF EXISTS "Owners and admins can update transfers" ON transfers;
DROP POLICY IF EXISTS "Owners and admins can delete transfers" ON transfers;
DROP POLICY IF EXISTS "Admins can insert transfers" ON transfers;
DROP POLICY IF EXISTS "Admins can update transfers" ON transfers;
DROP POLICY IF EXISTS "Admins can delete transfers" ON transfers;

CREATE POLICY "Owners and admins can insert transfers" ON transfers 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE id = transfers.fantasy_team_id 
        AND owner_id = (select auth.uid())
    )
    OR is_admin((select auth.uid()))
  );

CREATE POLICY "Owners and admins can update transfers" ON transfers 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE id = transfers.fantasy_team_id 
        AND owner_id = (select auth.uid())
    )
    OR is_admin((select auth.uid()))
  );

CREATE POLICY "Owners and admins can delete transfers" ON transfers 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE id = transfers.fantasy_team_id 
        AND owner_id = (select auth.uid())
    )
    OR is_admin((select auth.uid()))
  );

-- ============================================
-- 5. TEAMS POLICIES
-- ============================================
-- Has "Teams are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on teams" ON teams;
DROP POLICY IF EXISTS "Admins can insert teams" ON teams;
DROP POLICY IF EXISTS "Admins can update teams" ON teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON teams;

CREATE POLICY "Admins can insert teams" ON teams 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update teams" ON teams 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete teams" ON teams 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 6. PLAYERS POLICIES
-- ============================================
-- Has "Players are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on players" ON players;
DROP POLICY IF EXISTS "Admins can insert players" ON players;
DROP POLICY IF EXISTS "Admins can update players" ON players;
DROP POLICY IF EXISTS "Admins can delete players" ON players;

CREATE POLICY "Admins can insert players" ON players 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update players" ON players 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete players" ON players 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 7. GAMES POLICIES
-- ============================================
-- Has "Games are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on games" ON games;
DROP POLICY IF EXISTS "Admins can insert games" ON games;
DROP POLICY IF EXISTS "Admins can update games" ON games;
DROP POLICY IF EXISTS "Admins can delete games" ON games;

CREATE POLICY "Admins can insert games" ON games 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update games" ON games 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete games" ON games 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 8. PLAYER_STATS POLICIES
-- ============================================
-- Has "Player stats are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on player_stats" ON player_stats;
DROP POLICY IF EXISTS "Admins can insert player_stats" ON player_stats;
DROP POLICY IF EXISTS "Admins can update player_stats" ON player_stats;
DROP POLICY IF EXISTS "Admins can delete player_stats" ON player_stats;

CREATE POLICY "Admins can insert player_stats" ON player_stats 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update player_stats" ON player_stats 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete player_stats" ON player_stats 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 9. SEASONS POLICIES
-- ============================================
-- Has "Seasons are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on seasons" ON seasons;
DROP POLICY IF EXISTS "Admins can insert seasons" ON seasons;
DROP POLICY IF EXISTS "Admins can update seasons" ON seasons;
DROP POLICY IF EXISTS "Admins can delete seasons" ON seasons;

CREATE POLICY "Admins can insert seasons" ON seasons 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update seasons" ON seasons 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete seasons" ON seasons 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 10. WEEKS POLICIES
-- ============================================
-- Has "Weeks are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on weeks" ON weeks;
DROP POLICY IF EXISTS "Admins can insert weeks" ON weeks;
DROP POLICY IF EXISTS "Admins can update weeks" ON weeks;
DROP POLICY IF EXISTS "Admins can delete weeks" ON weeks;

CREATE POLICY "Admins can insert weeks" ON weeks 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update weeks" ON weeks 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete weeks" ON weeks 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 11. VALUE_CHANGES POLICIES
-- ============================================
-- Has "Value changes are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on value_changes" ON value_changes;
DROP POLICY IF EXISTS "Admins can insert value_changes" ON value_changes;
DROP POLICY IF EXISTS "Admins can update value_changes" ON value_changes;
DROP POLICY IF EXISTS "Admins can delete value_changes" ON value_changes;

CREATE POLICY "Admins can insert value_changes" ON value_changes 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update value_changes" ON value_changes 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete value_changes" ON value_changes 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 12. FANTASY_TEAM_SCORES POLICIES
-- ============================================
-- Has "Fantasy team scores are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can manage fantasy team scores" ON fantasy_team_scores;
DROP POLICY IF EXISTS "Admins can insert fantasy team scores" ON fantasy_team_scores;
DROP POLICY IF EXISTS "Admins can update fantasy team scores" ON fantasy_team_scores;
DROP POLICY IF EXISTS "Admins can delete fantasy team scores" ON fantasy_team_scores;

CREATE POLICY "Admins can insert fantasy team scores" ON fantasy_team_scores 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (select auth.uid()) AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can update fantasy team scores" ON fantasy_team_scores 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (select auth.uid()) AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can delete fantasy team scores" ON fantasy_team_scores 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (select auth.uid()) AND is_admin = TRUE
    )
  );

-- ============================================
-- 13. USER_PROFILES POLICIES
-- ============================================
-- Has "User profiles are viewable by everyone" - combine user/admin UPDATE into single policy

DROP POLICY IF EXISTS "Admins can manage user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users or admins can update user profiles" ON user_profiles;

CREATE POLICY "Admins can insert user profiles" ON user_profiles 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Users or admins can update user profiles" ON user_profiles 
  FOR UPDATE USING (
    (select auth.uid()) = id 
    OR is_admin((select auth.uid()))
  );

CREATE POLICY "Admins can delete user profiles" ON user_profiles 
  FOR DELETE USING (is_admin((select auth.uid())));

-- ============================================
-- 14. SEASON_PLAYERS POLICIES
-- ============================================
-- Has "Season players are viewable by everyone" - split admin policy

DROP POLICY IF EXISTS "Admins can do everything on season_players" ON season_players;
DROP POLICY IF EXISTS "Admins can insert season_players" ON season_players;
DROP POLICY IF EXISTS "Admins can update season_players" ON season_players;
DROP POLICY IF EXISTS "Admins can delete season_players" ON season_players;

CREATE POLICY "Admins can insert season_players" ON season_players 
  FOR INSERT WITH CHECK (is_admin((select auth.uid())));

CREATE POLICY "Admins can update season_players" ON season_players 
  FOR UPDATE USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can delete season_players" ON season_players 
  FOR DELETE USING (is_admin((select auth.uid())));
