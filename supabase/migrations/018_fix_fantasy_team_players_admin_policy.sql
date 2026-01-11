-- Fix fantasy_team_players RLS policy to allow admins to manage players on any team
-- This enables admin panel functionality for creating/editing teams for other users

DROP POLICY IF EXISTS "Users can manage players on own teams" ON fantasy_team_players;

-- Split into specific policies for better control

-- SELECT: Owners can view their team's players, admins can view all
CREATE POLICY "Owners or admins can view fantasy team players" ON fantasy_team_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_players.fantasy_team_id
        AND owner_id = (select auth.uid())
    )
    OR is_admin((select auth.uid()))
  );

-- INSERT: Owners can add players to their teams, admins can add to any team
CREATE POLICY "Owners or admins can insert fantasy team players" ON fantasy_team_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_players.fantasy_team_id
        AND owner_id = (select auth.uid())
    )
    OR is_admin((select auth.uid()))
  );

-- UPDATE: Owners can update their team's players, admins can update any
CREATE POLICY "Owners or admins can update fantasy team players" ON fantasy_team_players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_players.fantasy_team_id
        AND owner_id = (select auth.uid())
    )
    OR is_admin((select auth.uid()))
  );

-- DELETE: Owners can remove players from their teams, admins can remove from any
CREATE POLICY "Owners or admins can delete fantasy team players" ON fantasy_team_players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE id = fantasy_team_players.fantasy_team_id
        AND owner_id = (select auth.uid())
    )
    OR is_admin((select auth.uid()))
  );
