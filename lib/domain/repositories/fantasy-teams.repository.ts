import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { FantasyTeam, InsertFantasyTeam, UpdateFantasyTeam } from '../types';

export class FantasyTeamsRepository extends BaseRepository<FantasyTeam, InsertFantasyTeam, UpdateFantasyTeam> {
  constructor(client: SupabaseClient) {
    super(client, 'fantasy_teams');
  }

  async findByOwner(ownerId: string): Promise<FantasyTeam[]> {
    return this.findAll({ owner_id: ownerId } as Partial<FantasyTeam>);
  }

  async findBySeason(seasonId: string): Promise<FantasyTeam[]> {
    return this.findAll({ season_id: seasonId } as Partial<FantasyTeam>);
  }

  async findByOwnerAndSeason(ownerId: string, seasonId: string): Promise<FantasyTeam[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('owner_id', ownerId)
      .eq('season_id', seasonId);

    if (error) {
      throw new Error(`Failed to find fantasy teams by owner and season: ${error.message}`);
    }

    return (data || []) as FantasyTeam[];
  }
}


