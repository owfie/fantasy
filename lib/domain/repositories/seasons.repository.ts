import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Season, InsertSeason, UpdateSeason } from '../types';

export class SeasonsRepository extends BaseRepository<Season, InsertSeason, UpdateSeason> {
  constructor(client: SupabaseClient) {
    super(client, 'seasons');
  }

  async findActive(): Promise<Season | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find active season: ${error.message}`);
    }

    return data as Season;
  }
}

