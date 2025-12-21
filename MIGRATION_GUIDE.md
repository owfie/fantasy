# Migration Guide - Setting Up Supabase

## Prerequisites

1. **Supabase Project**: You need a Supabase project. If you don't have one:
   - Go to [https://database.new](https://database.new)
   - Create a new project
   - Note your project URL and anon key

2. **Environment Variables**: Make sure you have `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
   ```

## Step 1: Run Migrations

### Option A: Using Supabase Dashboard (Recommended for first time)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for it to complete (should see "Success. No rows returned")
8. Repeat for `supabase/migrations/002_seed_test_data.sql`

### Option B: Using Supabase CLI (If you have it installed)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Step 2: Verify Migrations

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `user_profiles`
   - `teams`
   - `players`
   - `seasons`
   - `weeks`
   - `games`
   - `fantasy_teams`
   - `fantasy_team_players`
   - `player_stats`
   - `fantasy_team_scores`
   - `roster_changes`
   - `player_availability`
   - `transfers`
   - `value_changes`

3. Check `teams` table - should have 4 teams (Force, Flyers, Riptide, Titans)
4. Check `players` table - should have ~40 players

## Step 3: Test the Application

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Visit `http://localhost:3000/teams` to see the test page

3. Check the browser console and terminal for any errors

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran both migration files
- Check that tables were created in Table Editor

### Error: "permission denied"
- Check RLS policies were created
- Verify your user is authenticated (if needed)

### Error: "invalid input syntax for type uuid"
- Make sure the admin user UUID matches your Discord user UUID
- Check `user_profiles` table has the admin user

### Environment Variables Not Found
- Make sure `.env.local` exists in project root
- Restart the dev server after adding env vars
- Check variable names match exactly (no typos)

## Next Steps

Once migrations are successful:
1. Test creating a team via the `/teams` page
2. Test the Unit of Work pattern
3. Verify data appears in Supabase dashboard


