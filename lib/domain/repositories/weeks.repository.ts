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

  /**
   * Find a week by season ID and week number
   * Alias for findByWeekNumber for clarity in service layer
   */
  async findBySeasonAndWeekNumber(seasonId: string, weekNumber: number): Promise<Week | null> {
    return this.findByWeekNumber(seasonId, weekNumber);
  }

  /**
   * Find all weeks with open transfer windows for a season
   * Used to enforce single open window constraint at service layer
   */
  async findOpenWindowsForSeason(seasonId: string): Promise<Week[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('season_id', seasonId)
      .eq('transfer_window_open', true)
      .order('week_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to find open windows: ${error.message}`);
    }

    return (data || []) as Week[];
  }

  /**
   * Find the highest window number that has been published (transfer_window_open was true at some point)
   * For user-facing price visibility - only show prices from windows that have been opened
   */
  async findHighestVisibleWindow(seasonId: string): Promise<Week | null> {
    // A window is "visible" if it's currently open OR if prices were calculated
    // (which means it was opened at some point)
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('season_id', seasonId)
      .eq('prices_calculated', true)
      .order('week_number', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find visible window: ${error.message}`);
    }

    return data as Week;
  }
}

