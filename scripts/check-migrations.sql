-- Quick check script to verify migrations ran successfully
-- Run this in Supabase SQL Editor after migrations

-- Check tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_profiles',
    'teams',
    'players',
    'seasons',
    'weeks',
    'games',
    'fantasy_teams',
    'fantasy_team_players',
    'player_stats',
    'fantasy_team_scores',
    'roster_changes',
    'player_availability',
    'transfers',
    'value_changes'
  )
ORDER BY table_name;

-- Check data was seeded
SELECT 'teams' as table_name, COUNT(*) as count FROM teams
UNION ALL
SELECT 'players', COUNT(*) FROM players
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles;

-- Check admin user exists
SELECT id, email, is_admin FROM user_profiles WHERE is_admin = TRUE;


