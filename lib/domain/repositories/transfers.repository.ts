import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Transfer, InsertTransfer, UpdateTransfer } from '../types';

export class TransfersRepository extends BaseRepository<Transfer, InsertTransfer, UpdateTransfer> {
  constructor(client: SupabaseClient) {
    super(client, 'transfers');
  }

  async findByFantasyTeam(fantasyTeamId: string): Promise<Transfer[]> {
    return this.findAll({ fantasy_team_id: fantasyTeamId } as Partial<Transfer>);
  }

  async findByWeek(weekId: string): Promise<Transfer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('week_id', weekId);

    if (error) {
      throw new Error(`Failed to find transfers by week: ${error.message}`);
    }

    return (data || []) as Transfer[];
  }

  async findByFantasyTeamAndWeek(fantasyTeamId: string, weekId: string): Promise<Transfer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('fantasy_team_id', fantasyTeamId)
      .eq('week_id', weekId);

    if (error) {
      throw new Error(`Failed to find transfers by fantasy team and week: ${error.message}`);
    }

    return (data || []) as Transfer[];
  }

  async countByFantasyTeamAndWeek(fantasyTeamId: string, weekId: string): Promise<number> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('fantasy_team_id', fantasyTeamId)
      .eq('week_id', weekId);

    if (error) {
      throw new Error(`Failed to count transfers: ${error.message}`);
    }

    return data?.length || 0;
  }
}

