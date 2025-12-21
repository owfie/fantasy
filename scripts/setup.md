# Quick Setup Instructions

## 1. Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
```

Get these from: https://supabase.com/dashboard/project/_/settings/api

## 2. Run Migrations

### In Supabase Dashboard:

1. Go to **SQL Editor** → **New Query**
2. Open `supabase/migrations/001_initial_schema.sql`
3. Copy entire file and paste into SQL Editor
4. Click **Run** (Cmd/Ctrl + Enter)
5. Repeat for `002_seed_test_data.sql`

## 3. Test

```bash
pnpm dev
```

Visit: http://localhost:3000/test

You should see teams and players listed if everything worked!


