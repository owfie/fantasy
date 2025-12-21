# CRUD Pattern Guide

This guide explains how to implement CRUD operations (Create, Read, Update, Delete Soft, Delete Hard) following SOLID principles. The pattern is demonstrated with Teams and can be easily duplicated for other entities.

## Architecture Overview

```
lib/domain/
├── services/
│   ├── base-crud.service.ts    # Base CRUD service (reusable)
│   └── teams.service.ts         # Teams-specific service (extends base)
└── repositories/
    └── teams.repository.ts      # Teams repository
```

## SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)
- **BaseCrudService**: Handles generic CRUD operations
- **TeamsService**: Handles team-specific business logic and validation
- **TeamsRepository**: Handles data access only

### 2. Open/Closed Principle (OCP)
- **BaseCrudService** is open for extension (via inheritance) but closed for modification
- New entity services extend BaseCrudService without changing the base class

### 3. Liskov Substitution Principle (LSP)
- **TeamsService** can be used anywhere **BaseCrudService** is expected
- All entity services follow the same interface contract

### 4. Interface Segregation Principle (ISP)
- **IBaseCrudService** provides a focused interface with only necessary methods
- Clients depend only on methods they use

### 5. Dependency Inversion Principle (DIP)
- Services depend on **UnitOfWork** abstraction, not concrete implementations
- Repositories are injected via UnitOfWork

## Implementation Steps

### Step 1: Create Entity Service

```typescript
// lib/domain/services/players.service.ts
import { UnitOfWork } from '../unit-of-work';
import { BaseCrudService } from './base-crud.service';
import { PlayersRepository } from '../repositories';
import { Player, InsertPlayer, UpdatePlayer } from '../types';

export class PlayersService extends BaseCrudService<Player, InsertPlayer, UpdatePlayer> {
  constructor(uow: UnitOfWork) {
    super(uow, uow.players);
  }

  // Override create to add validation
  async create(data: InsertPlayer): Promise<Player> {
    return this.uow.execute(async () => {
      // Add entity-specific validation
      // Example: Check for duplicate names, validate values, etc.
      
      return await this.repository.create(data);
    });
  }

  // Override update to add validation
  async update(data: UpdatePlayer): Promise<Player> {
    return this.uow.execute(async () => {
      // Add entity-specific validation
      
      return await this.repository.update(data);
    });
  }

  // Override soft delete (if entity has is_active field)
  async deleteSoft(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const entity = await this.repository.findById(id);
      if (!entity) {
        throw new Error('Entity not found');
      }

      // Mark as inactive
      await this.repository.update({
        id,
        is_active: false,
      } as UpdatePlayer);
    });
  }

  // Override hard delete to add validation
  async deleteHard(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const entity = await this.repository.findById(id);
      if (!entity) {
        throw new Error('Entity not found');
      }

      // Check for related entities
      // Example: Can't delete player if they have stats
      const stats = await this.uow.playerStats.findByPlayer(id);
      if (stats.length > 0) {
        throw new Error('Cannot delete player with stats. Remove stats first.');
      }

      await this.repository.delete(id);
    });
  }

  // Add entity-specific methods
  async findByTeam(teamId: string): Promise<Player[]> {
    return await this.uow.players.findByTeam(teamId);
  }
}
```

### Step 2: Export Service

```typescript
// lib/domain/services/index.ts
export { PlayersService } from './players.service';
```

### Step 3: Create Test Actions

```typescript
// app/test/actions.ts

import { PlayersService } from '@/lib/domain/services';
import { InsertPlayer, UpdatePlayer } from '@/lib/domain/types';

// Create
export async function testCreatePlayer(data: InsertPlayer) {
  const uow = await getUnitOfWork();
  const service = new PlayersService(uow);
  
  try {
    const player = await service.create(data);
    return { success: true, message: 'Player created successfully', data: player };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// Update
export async function testUpdatePlayer(playerId: string, updates: Partial<UpdatePlayer>) {
  const uow = await getUnitOfWork();
  const service = new PlayersService(uow);
  
  try {
    const player = await service.update({ id: playerId, ...updates });
    return { success: true, message: 'Player updated successfully', data: player };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// Soft Delete
export async function testSoftDeletePlayer(playerId: string) {
  const uow = await getUnitOfWork();
  const service = new PlayersService(uow);
  
  try {
    await service.deleteSoft(playerId);
    return { success: true, message: 'Player soft deleted successfully', data: null };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// Hard Delete
export async function testHardDeletePlayer(playerId: string) {
  const uow = await getUnitOfWork();
  const service = new PlayersService(uow);
  
  try {
    await service.deleteHard(playerId);
    return { success: true, message: 'Player permanently deleted', data: null };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// Get by ID
export async function testGetPlayer(playerId: string) {
  const uow = await getUnitOfWork();
  const service = new PlayersService(uow);
  
  try {
    const player = await service.findById(playerId);
    if (!player) {
      return { success: false, message: 'Player not found', data: null };
    }
    return { success: true, message: 'Player retrieved', data: player };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}

// Get All
export async function testGetAllPlayers() {
  const uow = await getUnitOfWork();
  const service = new PlayersService(uow);
  
  try {
    const players = await service.findAll();
    return { success: true, message: `Found ${players.length} players`, data: players };
  } catch (error: any) {
    return { success: false, message: error.message, error: error.message };
  }
}
```

### Step 4: Create Client Component

Copy `app/test/teams-crud-client.tsx` and adapt it for your entity:

1. Replace `Team` with your entity type
2. Update form fields to match your entity properties
3. Update action imports
4. Update component name and props

## Key Patterns

### Transaction Management
All operations use `uow.execute()` to ensure transactional consistency:

```typescript
return this.uow.execute(async () => {
  // All operations here are transactional
  // If any operation fails, all are rolled back
});
```

### Validation
- **Create**: Check for duplicates, validate required fields
- **Update**: Verify entity exists, check for duplicates if name changes
- **Soft Delete**: Mark as inactive (if entity supports it)
- **Hard Delete**: Validate no related entities exist

### Error Handling
All operations return consistent result objects:

```typescript
{
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}
```

## Benefits

1. **Reusability**: BaseCrudService provides common functionality
2. **Consistency**: All entities follow the same pattern
3. **Maintainability**: Changes to base class benefit all entities
4. **Testability**: Easy to test with dependency injection
5. **Extensibility**: Easy to add new entities following the same pattern

## Example: Adding Players CRUD

1. Create `lib/domain/services/players.service.ts` (extends BaseCrudService)
2. Add test actions in `app/test/actions.ts`
3. Create `app/test/players-crud-client.tsx` (copy from teams-crud-client.tsx)
4. Add to test page: `<PlayersCrudClient players={players} />`

The same pattern works for any entity: Games, Seasons, Weeks, FantasyTeams, etc.

