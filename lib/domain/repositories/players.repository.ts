import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Player, InsertPlayer, UpdatePlayer } from '../types';

export class PlayersRepository extends BaseRepository<Player, InsertPlayer, UpdatePlayer> {
  constructor(client: SupabaseClient) {
    super(client, 'players');
  }

  async findByTeam(teamId: string): Promise<Player[]> {
    return this.findAll({ team_id: teamId } as Partial<Player>);
  }

  async findByRole(role: Player['player_role']): Promise<Player[]> {
    return this.findAll({ player_role: role } as Partial<Player>);
  }

  async findActive(): Promise<Player[]> {
    return this.findAll({ is_active: true } as Partial<Player>);
  }

  async findByDraftOrder(min?: number, max?: number): Promise<Player[]> {
    let query = this.client.from(this.tableName).select('*').not('draft_order', 'is', null);

    if (min !== undefined) {
      query = query.gte('draft_order', min);
    }
    if (max !== undefined) {
      query = query.lte('draft_order', max);
    }

    const { data, error } = await query.order('draft_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to find players by draft order: ${error.message}`);
    }

    return (data || []) as Player[];
  }
}


