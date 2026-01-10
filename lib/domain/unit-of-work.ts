/**
 * Unit of Work pattern implementation
 * Manages repositories and provides transactional operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  TeamsRepository,
  PlayersRepository,
  FantasyTeamsRepository,
  FantasyTeamPlayersRepository,
  PlayerStatsRepository,
  SeasonsRepository,
  WeeksRepository,
  GamesRepository,
  ArticleAuthorsRepository,
  ArticleTagsRepository,
  ArticlesRepository,
  ValueChangesRepository,
  SeasonPlayersRepository,
  FantasyTeamSnapshotsRepository,
  FantasyTeamSnapshotPlayersRepository,
  TransfersRepository,
  PlayerAvailabilityRepository,
} from './repositories';

// Track operations for rollback
interface TrackedOperation {
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown> & { id: string };
}

export class UnitOfWork {
  private client: SupabaseClient;
  
  // Repositories
  public readonly teams: TeamsRepository;
  public readonly players: PlayersRepository;
  public readonly fantasyTeams: FantasyTeamsRepository;
  public readonly fantasyTeamPlayers: FantasyTeamPlayersRepository;
  public readonly playerStats: PlayerStatsRepository;
  public readonly seasons: SeasonsRepository;
  public readonly weeks: WeeksRepository;
  public readonly games: GamesRepository;
  public readonly articleAuthors: ArticleAuthorsRepository;
  public readonly articleTags: ArticleTagsRepository;
  public readonly articles: ArticlesRepository;
  public readonly valueChanges: ValueChangesRepository;
  public readonly seasonPlayers: SeasonPlayersRepository;
  public readonly fantasyTeamSnapshots: FantasyTeamSnapshotsRepository;
  public readonly fantasyTeamSnapshotPlayers: FantasyTeamSnapshotPlayersRepository;
  public readonly transfers: TransfersRepository;
  public readonly playerAvailability: PlayerAvailabilityRepository;

  private operations: TrackedOperation[] = [];
  private committed: boolean = false;

  constructor(client: SupabaseClient) {
    this.client = client;
    
    // Initialize repositories
    this.teams = new TeamsRepository(client);
    this.players = new PlayersRepository(client);
    this.fantasyTeams = new FantasyTeamsRepository(client);
    this.fantasyTeamPlayers = new FantasyTeamPlayersRepository(client);
    this.playerStats = new PlayerStatsRepository(client);
    this.seasons = new SeasonsRepository(client);
    this.weeks = new WeeksRepository(client);
    this.games = new GamesRepository(client);
    this.articleAuthors = new ArticleAuthorsRepository(client);
    this.articleTags = new ArticleTagsRepository(client);
    this.articles = new ArticlesRepository(client);
    this.valueChanges = new ValueChangesRepository(client);
    this.seasonPlayers = new SeasonPlayersRepository(client);
    this.fantasyTeamSnapshots = new FantasyTeamSnapshotsRepository(client);
    this.fantasyTeamSnapshotPlayers = new FantasyTeamSnapshotPlayersRepository(client);
    this.transfers = new TransfersRepository(client);
    this.playerAvailability = new PlayerAvailabilityRepository(client);
  }

  /**
   * Execute a function within a transaction-like context
   * Uses Supabase RPC for complex transactions, or batches operations
   */
  async execute<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    try {
      const result = await fn(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Commit all operations
   * For Supabase, operations are already committed individually
   * This method is here for consistency and future transaction support
   */
  private async commit(): Promise<void> {
    if (this.committed) {
      return;
    }

    // In Supabase, operations are committed immediately
    // For true transactions, we'd need to use database functions (RPC)
    // This is a placeholder for future enhancement
    this.committed = true;
    this.operations = [];
  }

  /**
   * Rollback operations
   * Note: Supabase doesn't support true rollback without database functions
   * This tracks operations for manual rollback if needed
   */
  private async rollback(): Promise<void> {
    if (this.committed) {
      return;
    }

    // Reverse operations in reverse order
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];
      try {
        switch (op.type) {
          case 'create':
            await this.client.from(op.table).delete().eq('id', op.data.id);
            break;
          case 'update':
            // Restore previous state - would need to track original data
            // For now, this is a placeholder
            break;
          case 'delete':
            await this.client.from(op.table).insert(op.data);
            break;
        }
      } catch (error) {
        console.error(`Failed to rollback operation on ${op.table}:`, error);
      }
    }

    this.operations = [];
  }

  /**
   * Track an operation for potential rollback
   */
  trackOperation(type: 'create' | 'update' | 'delete', table: string, data: Record<string, unknown> & { id: string }): void {
    this.operations.push({ type, table, data });
  }

  /**
   * Execute a database function (RPC) for true transaction support
   * Use this for complex operations that need ACID guarantees
   */
  async executeRpc<T = unknown>(functionName: string, params?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(functionName, params || {});

    if (error) {
      throw new Error(`RPC ${functionName} failed: ${error.message}`);
    }

    return data as T;
  }

  /**
   * Execute multiple operations in a batch
   * Supabase supports batch operations through multiple inserts/updates
   */
  async batch<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = [];
    
    for (const operation of operations) {
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        // If any operation fails, we can't rollback previous ones in Supabase
        // This is a limitation - for true transactions, use RPC functions
        throw error;
      }
    }

    return results;
  }

  /**
   * Get the underlying Supabase client for advanced operations
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}

/**
 * Create a Unit of Work instance
 * Use this factory function to ensure proper client initialization
 */
export function createUnitOfWork(client: SupabaseClient): UnitOfWork {
  return new UnitOfWork(client);
}


