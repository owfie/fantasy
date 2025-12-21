# Quick Start Guide

## ✅ You Already Have:
- Environment variables configured (`.env.local`)
- Supabase project set up

## 🚀 Next Steps:

### 1. Run Database Migrations

**Option A: Via Supabase Dashboard (Easiest)**

1. Go to your Supabase project: https://supabase.com/dashboard/project/souvuhquvyvoufxujlpc
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `supabase/migrations/001_initial_schema.sql` in your editor
5. Copy the **entire file** and paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success. No rows returned"
8. Repeat steps 3-7 for `supabase/migrations/002_seed_test_data.sql`

**Option B: Copy-Paste Commands**

You can also copy the SQL directly:

```bash
# View migration 1
cat supabase/migrations/001_initial_schema.sql

# View migration 2  
cat supabase/migrations/002_seed_test_data.sql
```

### 2. Verify Migrations

After running migrations, check:

1. Go to **Table Editor** in Supabase dashboard
2. You should see 14 tables created
3. Check `teams` table - should have 4 teams
4. Check `players` table - should have ~40 players

### 3. Test the Application

```bash
# Start dev server
pnpm dev
```

Then visit:
- **http://localhost:3000/test** - Database connection test page
- **http://localhost:3000/teams** - Teams page example

### 4. What to Expect

On `/test` page, you should see:
- ✅ Status: Connected!
- List of 4 teams (Force, Flyers, Riptide, Titans)
- List of players (first 10 shown)

If you see errors, check:
- Did you run both migration files?
- Are environment variables correct?
- Check browser console and terminal for error messages

## 🎯 Common Issues

**"relation does not exist"**
→ Run both migration files in order

**"permission denied"**  
→ Check RLS policies were created (they're in migration 1)

**"invalid input syntax for type uuid"**
→ The admin user UUID should match your Discord user

**Environment variables not found**
→ Restart dev server after creating `.env.local`

## 📝 Next Steps After Setup

Once migrations are successful:
1. Test creating/updating teams via `/teams` page
2. Explore the Unit of Work pattern
3. Start building your features!


