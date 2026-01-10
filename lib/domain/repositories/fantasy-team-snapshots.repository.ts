import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { FantasyTeamSnapshot, InsertFantasyTeamSnapshot, UpdateFantasyTeamSnapshot } from '../types';

export class FantasyTeamSnapshotsRepository extends BaseRepository<FantasyTeamSnapshot, InsertFantasyTeamSnapshot, UpdateFantasyTeamSnapshot> {
  constructor(client: SupabaseClient) {
    super(client, 'fantasy_team_snapshots');
  }

  async findByFantasyTeam(fantasyTeamId: string): Promise<FantasyTeamSnapshot[]> {
    return this.findAll({ fantasy_team_id: fantasyTeamId } as Partial<FantasyTeamSnapshot>);
  }

  async findByWeek(weekId: string): Promise<FantasyTeamSnapshot[]> {
    return this.findAll({ week_id: weekId } as Partial<FantasyTeamSnapshot>);
  }

  async findByFantasyTeamAndWeek(fantasyTeamId: string, weekId: string): Promise<FantasyTeamSnapshot | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('fantasy_team_id', fantasyTeamId)
      .eq('week_id', weekId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to find snapshot by fantasy team and week: ${error.message}`);
    }

    return data as FantasyTeamSnapshot;
  }

  async findLatestForFantasyTeam(fantasyTeamId: string): Promise<FantasyTeamSnapshot | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('fantasy_team_id', fantasyTeamId)
      .order('snapshot_created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to find latest snapshot: ${error.message}`);
    }

    return data as FantasyTeamSnapshot;
  }
}

