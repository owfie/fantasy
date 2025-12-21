import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Game, InsertGame, UpdateGame } from '../types';

export class GamesRepository extends BaseRepository<Game, InsertGame, UpdateGame> {
  constructor(client: SupabaseClient) {
    super(client, 'games');
  }

  async findByWeek(weekId: string): Promise<Game[]> {
    return this.findAll({ week_id: weekId } as Partial<Game>);
  }

  async findByTeam(teamId: string): Promise<Game[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

    if (error) {
      throw new Error(`Failed to find games by team: ${error.message}`);
    }

    return (data || []) as Game[];
  }
}

