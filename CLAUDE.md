# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server (Next.js with Turbopack)
npm run build            # Production build
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix

# Testing (Vitest)
npm test                 # Run all tests once
npm run test:watch       # Watch mode
npm run test:fantasy     # Run fantasy-specific tests
vitest run lib/__tests__/budget.test.ts  # Single test file

# Type checking
npx tsc --noEmit
```

Tests require `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` to bypass RLS policies.

## Architecture

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL), TanStack Query, Zustand, Tailwind + SCSS Modules

### Domain-Driven Design Layer (`lib/domain/`)

The core architecture uses **Unit of Work + Repository pattern**:

```
lib/domain/
├── types.ts           # All entity types matching DB schema (Player, FantasyTeam, Week, etc.)
├── unit-of-work.ts    # Coordinates 18 repositories, provides transactional execute()
├── repositories/      # Data access layer - each extends BaseRepository<Entity, Insert, Update>
└── services/          # Business logic (PriceCalculationService, TransferService, etc.)
```

**Data flow**:
- Server components: Direct repository access via UoW
- Client components: TanStack Query hooks (`lib/queries/`) → API functions (`lib/api/`) → Repositories

### Key Services

- **PriceCalculationService**: Player price formula: `NewValue = PreviousValue + (10 * TwoWeekPointsAverage - PreviousValue) / 4`
- **TransferService**: Transfer windows, limits (2/week after first week), cutoff enforcement
- **FantasyScoreService**: Scoring: `goals + (assists × 2) + (blocks × 3) - drops - throwaways` (captain doubled)
- **FantasyTeamSnapshotService**: Weekly roster snapshots for transfer computation

### Transfer Window States

Derived via `getTransferWindowState()`: `upcoming` → `ready` → `open` → `completed`

- TW0 (before Week 1): No prior stats needed
- TW_n (before Week n+1): Requires Week n prices calculated

### Component Architecture

```
Is the page mostly static/read-only?
├─ YES → Server Component
│         └─ Need interactivity? → Add Client Component with TanStack Query mutations
└─ NO (highly interactive)?
    └─ Client Component with TanStack Query
```

Client components use `-client.tsx` suffix (e.g., `transfer-windows-client.tsx`).

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Repository | `{Entity}Repository` | `PlayersRepository` |
| Service | `{Domain}Service` | `PriceCalculationService` |
| API function | `get{Resource}()` | `getPlayerPricesTable()` |
| Query hook | `use{Resource}()` | `usePlayerPricesTable()` |
| Entity types | `{Entity}`, `Insert{Entity}`, `Update{Entity}` | `Player`, `InsertPlayer`, `UpdatePlayer` |
| SCSS modules | camelCase classes | `.transfersList`, `.header` |

## Domain Concepts

**Player Roles**: captain, player, marquee, rookie_marquee, reserve
**Positions**: handler, cutter, receiver
**Roster Snapshots**: Weekly snapshots track roster state; transfers computed from snapshot diffs

## File Structure Notes

- `app/admin/` - Admin dashboard and CRUD interfaces
- `app/api/` - Minimal API routes (most data access via lib/)
- `components/FantasyTeamSelection/` - Complex component (~30 files) for team management
- `lib/stores/` - Zustand stores for UI state (filters, toggles)
- `supabase/migrations/` - Database migrations (24 total)
