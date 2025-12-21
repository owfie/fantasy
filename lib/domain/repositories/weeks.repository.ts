import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Week, InsertWeek, UpdateWeek } from '../types';

export class WeeksRepository extends BaseRepository<Week, InsertWeek, UpdateWeek> {
  constructor(client: SupabaseClient) {
    super(client, 'weeks');
  }

  async findBySeason(seasonId: string): Promise<Week[]> {
    return this.findAll({ season_id: seasonId } as Partial<Week>);
  }

  async findByWeekNumber(seasonId: string, weekNumber: number): Promise<Week | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('season_id', seasonId)
      .eq('week_number', weekNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find week: ${error.message}`);
    }

    return data as Week;
  }
}

