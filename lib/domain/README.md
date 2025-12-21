# Domain Layer - Unit of Work Pattern

This directory contains the domain layer implementation using the Unit of Work pattern for transactional database operations.

## Architecture

```
lib/domain/
├── types.ts                    # TypeScript types for all entities
├── unit-of-work.ts             # Unit of Work class for transaction management
├── server-uow.ts               # Server-side helper to create UoW instances
├── repositories/
│   ├── base.repository.ts      # Base repository with common CRUD operations
│   ├── teams.repository.ts     # Teams repository
│   ├── players.repository.ts   # Players repository
│   ├── fantasy-teams.repository.ts
│   ├── fantasy-team-players.repository.ts
│   └── player-stats.repository.ts
└── services/
    └── fantasy-team.service.ts # Domain services with business logic
```

## Usage

### In Server Components

```typescript
import { getUnitOfWork } from '@/lib/domain/server-uow';

export default async function MyPage() {
  const uow = await getUnitOfWork();

  // Execute operations within a transaction-like context
  const result = await uow.execute(async (uow) => {
    const team = await uow.teams.findById('team-id');
    const players = await uow.players.findByTeam('team-id');
    return { team, players };
  });

  return <div>...</div>;
}
```

### In Server Actions

```typescript
'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { InsertTeam } from '@/lib/domain/types';

export async function createTeam(teamData: InsertTeam) {
  const uow = await getUnitOfWork();

  return uow.execute(async (uow) => {
    // All operations here are transactional
    const team = await uow.teams.create(teamData);
    // ... more operations
    return team;
  });
}
```

### Using Domain Services

```typescript
import { getUnitOfWork } from '@/lib/domain/server-uow';
import { FantasyTeamService } from '@/lib/domain/services';

export async function createFantasyTeam() {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);

  return uow.execute(async () => {
    return await service.createFantasyTeamWithPlayers(
      { owner_id: 'user-id', season_id: 'season-id', name: 'My Team' },
      [
        { playerId: 'player-1', isCaptain: true },
        { playerId: 'player-2' },
      ]
    );
  });
}
```

## Repositories

Each repository extends `BaseRepository` and provides:
- `findById(id)` - Find by ID
- `findAll(filter?)` - Find all with optional filter
- `create(data)` - Create new entity
- `createMany(data[])` - Create multiple entities
- `update(data)` - Update entity
- `delete(id)` - Delete entity
- `count(filter?)` - Count entities

Repositories also have entity-specific methods like:
- `TeamsRepository.findByName(name)`
- `PlayersRepository.findByTeam(teamId)`
- `FantasyTeamPlayersRepository.findActiveByFantasyTeam(teamId)`

## Unit of Work

The `UnitOfWork` class:
- Manages all repositories
- Provides `execute()` method for transactional operations
- Tracks operations for potential rollback
- Supports RPC calls for complex database transactions
- Provides batch operations

### Transaction Support

**Note**: Supabase doesn't support true database transactions in the JavaScript client like traditional ORMs. The Unit of Work pattern here provides:

1. **Transaction-like behavior**: Operations are grouped and can be rolled back manually
2. **RPC functions**: Use `executeRpc()` for complex operations that need true ACID guarantees
3. **Batch operations**: Use `batch()` for multiple operations

For true transactions, create database functions (RPC) in Supabase that handle the transaction logic.

## Domain Services

Domain services contain business logic and coordinate multiple repositories:

- `FantasyTeamService` - Manages fantasy team operations
  - `createFantasyTeamWithPlayers()` - Create team with players
  - `addPlayerToTeam()` - Add player to team
  - `removePlayerFromTeam()` - Remove player
  - `setCaptain()` - Set team captain
  - `calculateTeamValue()` - Calculate total team value

## Type Safety

All types are defined in `types.ts`:
- Entity types (e.g., `Team`, `Player`, `FantasyTeam`)
- Insert types (e.g., `InsertTeam`, `InsertPlayer`)
- Update types (e.g., `UpdateTeam`, `UpdatePlayer`)

Types match the database schema exactly, ensuring type safety throughout the application.

## Best Practices

1. **Always use `uow.execute()`** for operations that modify data
2. **Use domain services** for complex business logic
3. **Keep repositories simple** - they should only handle data access
4. **Use RPC functions** for operations requiring true ACID transactions
5. **Handle errors** - the Unit of Work will attempt rollback on errors

## Example: Complete Transaction

```typescript
const uow = await getUnitOfWork();

try {
  const result = await uow.execute(async (uow) => {
    // 1. Create team
    const team = await uow.teams.create({ name: 'New Team', color: '#FF0000' });

    // 2. Create players
    const players = await uow.players.createMany([
      { first_name: 'John', last_name: 'Doe', player_role: 'player', team_id: team.id },
      { first_name: 'Jane', last_name: 'Smith', player_role: 'captain', team_id: team.id },
    ]);

    // 3. Create fantasy team
    const fantasyTeam = await uow.fantasyTeams.create({
      owner_id: 'user-id',
      season_id: 'season-id',
      name: 'My Fantasy Team',
    });

    // 4. Add players to fantasy team
    await uow.fantasyTeamPlayers.createMany(
      players.map((p, i) => ({
        fantasy_team_id: fantasyTeam.id,
        player_id: p.id,
        is_captain: i === 1,
        is_active: true,
      }))
    );

    return { team, players, fantasyTeam };
  });

  // Success - all operations committed
  return result;
} catch (error) {
  // Error - operations rolled back
  console.error('Transaction failed:', error);
  throw error;
}
```


