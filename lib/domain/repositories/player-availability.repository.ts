import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { PlayerAvailability, InsertPlayerAvailability, UpdatePlayerAvailability } from '../types';

export class PlayerAvailabilityRepository extends BaseRepository<PlayerAvailability, InsertPlayerAvailability, UpdatePlayerAvailability> {
  constructor(client: SupabaseClient) {
    super(client, 'player_availability');
  }

  /**
   * Find availability for a specific game
   */
  async findByGame(gameId: string): Promise<PlayerAvailability[]> {
    return this.findAll({ game_id: gameId } as Partial<PlayerAvailability>);
  }

  /**
   * Find availability for a specific player
   */
  async findByPlayer(playerId: string): Promise<PlayerAvailability[]> {
    return this.findAll({ player_id: playerId } as Partial<PlayerAvailability>);
  }

  /**
   * Find availability for a player in a specific game
   */
  async findByPlayerAndGame(playerId: string, gameId: string): Promise<PlayerAvailability | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find player availability: ${error.message}`);
    }

    return data as PlayerAvailability;
  }

  /**
   * Upsert availability (create or update)
   */
  async upsert(data: InsertPlayerAvailability): Promise<PlayerAvailability> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .upsert(data, {
        onConflict: 'player_id,game_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert player availability: ${error.message}`);
    }

    return result as PlayerAvailability;
  }

  /**
   * Create or update availability for multiple players in a game
   */
  async upsertMany(availabilities: InsertPlayerAvailability[]): Promise<PlayerAvailability[]> {
    if (availabilities.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .upsert(availabilities, {
        onConflict: 'player_id,game_id',
      })
      .select();

    if (error) {
      throw new Error(`Failed to upsert player availabilities: ${error.message}`);
    }

    return (data || []) as PlayerAvailability[];
  }
}

