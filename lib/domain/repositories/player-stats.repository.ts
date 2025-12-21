import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { PlayerStats, InsertPlayerStats, UpdatePlayerStats } from '../types';

export class PlayerStatsRepository extends BaseRepository<PlayerStats, InsertPlayerStats, UpdatePlayerStats> {
  constructor(client: SupabaseClient) {
    super(client, 'player_stats');
  }

  async findByPlayer(playerId: string): Promise<PlayerStats[]> {
    return this.findAll({ player_id: playerId } as Partial<PlayerStats>);
  }

  async findByGame(gameId: string): Promise<PlayerStats[]> {
    return this.findAll({ game_id: gameId } as Partial<PlayerStats>);
  }

  async findByPlayerAndGame(playerId: string, gameId: string): Promise<PlayerStats | null> {
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
      throw new Error(`Failed to find player stats: ${error.message}`);
    }

    return data as PlayerStats;
  }
}


