# Database Structure Summary

## Decision: Supabase/PostgreSQL ✅

**Chosen over Google Sheets** because:
- Real-time updates and data integrity
- Built-in security with Row Level Security
- Scalable and performant
- Can build admin CRUD interface for non-technical users
- Better long-term maintainability

## Schema Overview

### Core Entities

1. **Users & Profiles**
   - `user_profiles` - Extends Supabase auth with admin flag
   - Admin user: `0xalfie@gmail.com` (UUID: `2eb0941a-b6bf-418a-a711-4db9426f5161`)

2. **League Structure**
   - `seasons` - League seasons
   - `weeks` - 7 weeks per season (1-7)
   - `teams` - Real-world teams (Force, Flyers, Riptide, Titans) with colors
   - `games` - Individual games between teams

3. **Players**
   - `players` - Individual players with roles:
     - `captain` - Team captain
     - `player` - Regular player
     - `marquee` - Retained from previous year
     - `rookie_marquee` - Retained from previous year (bottom 5 picks)
     - `reserve` - Picked in last 2 rounds
   - Includes `starting_value` and `draft_order` (from FantasyApplication)

4. **Fantasy Teams**
   - `fantasy_teams` - User's fantasy teams (with `original_value` and `total_value`)
   - `fantasy_team_players` - Players on fantasy teams (with captain/reserve flags)
   - `fantasy_team_scores` - Weekly calculated scores

5. **Scoring**
   - `player_stats` - Individual game stats (goals, assists, blocks, drops, throwaways)
   - Points formula: `goals + (assists × 2) + (blocks × 3) - drops - throwaways`
   - Captain gets double points

6. **Roster Management**
   - `roster_changes` - Track reserve substitutions
   - `player_availability` - Track player availability for games

7. **Transfers & Value Tracking** (from FantasyApplication)
   - `transfers` - Track player transfers with net value
   - `value_changes` - Track player value changes by round

## Key Features

### Automatic Score Calculation
- Trigger automatically updates `fantasy_team_scores` when `player_stats` change
- Captain points are doubled automatically
- Reserves don't count unless substituted in

### Security (RLS)
- Users can only see/edit their own fantasy teams
- Admins can manage everything
- Public read access for teams, players, games, stats

### Player Roles
- Real-world roles (captain, player, marquee, etc.) stored in `players.player_role`
- Fantasy roles (captain, reserve) stored in `fantasy_team_players`

## Migration Files

1. `001_initial_schema.sql` - Creates all tables, indexes, RLS policies, and functions
2. `002_seed_test_data.sql` - Imports test players from `test-players.json`

## Next Steps

1. **Run migrations in Supabase**
   - Copy `001_initial_schema.sql` to Supabase SQL Editor and run
   - Copy `002_seed_test_data.sql` and run

2. **Build Admin Interface**
   - Player management (CRUD)
   - Game management
   - Stat entry form
   - Season/week setup

3. **Build User Interface**
   - Draft interface
   - Roster management
   - Score viewing
   - Standings/leaderboard

4. **Test Data**
   - Create a test season
   - Create test weeks (1-7)
   - Create test games
   - Test stat entry and score calculation

## Database Relationships

```
seasons (1) ──→ (many) weeks
weeks (1) ──→ (many) games
teams (1) ──→ (many) players
teams (1) ──→ (many) games (home/away)
players (1) ──→ (many) player_stats
games (1) ──→ (many) player_stats
user_profiles (1) ──→ (many) fantasy_teams
fantasy_teams (1) ──→ (many) fantasy_team_players
players (1) ──→ (many) fantasy_team_players
fantasy_teams (1) ──→ (many) fantasy_team_scores
weeks (1) ──→ (many) fantasy_team_scores
```

## Scoring Logic

1. **Regular Players**: Sum of `points` from `player_stats` where `is_active = TRUE` and `is_reserve = FALSE` and `is_captain = FALSE`
2. **Captain**: Sum of `points × 2` from `player_stats` where `is_captain = TRUE`
3. **Reserves**: Only count if substituted in via `roster_changes`

Total = Regular Points + Captain Points

