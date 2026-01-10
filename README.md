<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Middleware
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Password-based authentication block installed via the [Supabase UI Library](https://supabase.com/ui/docs/nextjs/password-based-auth)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[INSERT SUPABASE PROJECT API ANON KEY]
   ```

   Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)



````
Is the page mostly static/read-only?
├─ YES → Server Component
│         └─ Need interactivity? → Add Client Component with TanStack Query mutations
│
└─ NO (highly interactive/dynamic)?
    └─ Client Component with TanStack Query
       └─ Examples: Dashboard, Admin panels, Real-time features
````

---

# Super League Fantasy Application

## Project Overview

A custom fantasy application for a local frisbee league. Players have starting values, and scoring is based on goals, assists, D's (blocks), drops (negative), and turnovers (negative). Users can construct teams within a salary cap and choose a captain each week to score double points. Users can make up to 2 trades per week. Player values appreciate or depreciate based on a rolling average formula. There may also be a bracket playoff for fantasy teams towards the end of the league.

## Database Architecture

### Technology Decision: Supabase/PostgreSQL

Chosen over Google Sheets because:
- ✅ Real-time updates and data integrity
- ✅ Built-in security with Row Level Security (RLS)
- ✅ Scalable and performant
- ✅ Admin CRUD interface for non-technical users
- ✅ Better long-term maintainability

### Core Schema Overview

**1. League Structure**
- `seasons` - League seasons (e.g., "2024 Season")
- `weeks` - 7 weeks per season (1-7)
- `teams` - Real-world teams (Force, Flyers, Riptide, Titans) with colors
- `games` - Individual games between teams

**2. Players**
- `players` - Individual players with roles:
  - `captain` - Team captain
  - `player` - Regular player
  - `marquee` - Retained from previous year
  - `rookie_marquee` - Retained from previous year (bottom 5 picks)
  - `reserve` - Picked in last 2 rounds
- Includes `starting_value` and `draft_order`

**3. Fantasy Teams**
- `fantasy_teams` - User's fantasy teams (with `original_value` and `total_value`)
- `fantasy_team_players` - Players on fantasy teams (with captain/reserve flags)
- `fantasy_team_scores` - Weekly calculated scores

**4. Scoring System**
- `player_stats` - Individual game stats (goals, assists, blocks, drops, throwaways)
- Points formula: `goals + (assists × 2) + (blocks × 3) - drops - throwaways`
- Captain gets double points automatically

**5. Roster Management**
- `roster_changes` - Track reserve substitutions
- `player_availability` - Track player availability for games

**6. Transfers & Value Tracking**
- `transfers` - Track player transfers with net value
- `value_changes` - Track player value changes by round

### Security (Row Level Security)

- Users can only see/edit their own fantasy teams
- Admins can manage everything
- Public read access for teams, players, games, stats

## Domain Layer Architecture

### Unit of Work Pattern

The application uses a Unit of Work pattern with repository pattern for transactional database operations:

**Structure:**
```
lib/domain/
├── types.ts                    # All entity types
├── unit-of-work.ts             # Unit of Work class
├── server-uow.ts               # Server helper
├── repositories/
│   ├── base.repository.ts     # Base repository
│   ├── teams.repository.ts
│   ├── players.repository.ts
│   └── ...
└── services/
    ├── base-crud.service.ts   # Base CRUD service
    └── fantasy-team.service.ts
```

**Key Features:**
- ✅ Type Safety - Full TypeScript support with types matching database schema
- ✅ Transactional Operations - All operations wrapped in `execute()` for consistency
- ✅ Repository Pattern - Clean separation of data access logic
- ✅ Domain Services - Business logic separated from data access
- ✅ SOLID Principles - Follows SOLID design principles

**Usage Example:**
```typescript
import { getUnitOfWork } from '@/lib/domain/server-uow';

const uow = await getUnitOfWork();
const teams = await uow.execute(async () => {
  return await uow.teams.findAll();
});
```

## CRUD Pattern Guide

### Implementation Pattern

All CRUD operations follow a consistent pattern using SOLID principles:

1. **BaseCrudService** - Generic CRUD operations (reusable)
2. **Entity Services** - Extend BaseCrudService for entity-specific logic
3. **Repositories** - Handle data access only

**Example:** Creating a new entity service:
```typescript
export class PlayersService extends BaseCrudService<Player, InsertPlayer, UpdatePlayer> {
  constructor(uow: UnitOfWork) {
    super(uow, uow.players);
  }

  async create(data: InsertPlayer): Promise<Player> {
    return this.uow.execute(async () => {
      // Add entity-specific validation
      return await this.repository.create(data);
    });
  }
}
```

**Benefits:**
- Reusability: BaseCrudService provides common functionality
- Consistency: All entities follow the same pattern
- Maintainability: Changes to base class benefit all entities
- Extensibility: Easy to add new entities

## Setup & Migration

### Prerequisites

1. **Supabase Project**: Create one at [https://database.new](https://database.new)
2. **Environment Variables**: Create `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### Running Migrations

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_initial_schema.sql` and paste into SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Repeat for `supabase/migrations/002_seed_test_data.sql`

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Verify Setup

After running migrations:
1. Check **Table Editor** - should see 14 tables created
2. Check `teams` table - should have 4 teams (Force, Flyers, Riptide, Titans)
3. Check `players` table - should have ~40 players

### Testing

```bash
# Start dev server
pnpm dev
```

Visit:
- `http://localhost:3000/test` - Database connection test page
- `http://localhost:3000/teams` - Teams page example

## Component Architecture Decision Tree

```
Is the page mostly static/read-only?
├─ YES → Server Component
│         └─ Need interactivity? → Add Client Component with TanStack Query mutations
│
└─ NO (highly interactive/dynamic)?
    └─ Client Component with TanStack Query
       └─ Examples: Dashboard, Admin panels, Real-time features
```

## Troubleshooting

**"relation does not exist"**
- Run both migration files in order

**"permission denied"**  
- Check RLS policies were created (included in migration 1)

**"invalid input syntax for type uuid"**
- Admin user UUID should match your Discord user UUID

**Environment variables not found**
- Restart dev server after creating `.env.local`