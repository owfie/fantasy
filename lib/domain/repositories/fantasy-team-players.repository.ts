import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { FantasyTeamPlayer, InsertFantasyTeamPlayer, UpdateFantasyTeamPlayer } from '../types';

export class FantasyTeamPlayersRepository extends BaseRepository<FantasyTeamPlayer, InsertFantasyTeamPlayer, UpdateFantasyTeamPlayer> {
  constructor(client: SupabaseClient) {
    super(client, 'fantasy_team_players');
  }

  async findByFantasyTeam(fantasyTeamId: string): Promise<FantasyTeamPlayer[]> {
    return this.findAll({ fantasy_team_id: fantasyTeamId } as Partial<FantasyTeamPlayer>);
  }

  async findActiveByFantasyTeam(fantasyTeamId: string): Promise<FantasyTeamPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('fantasy_team_id', fantasyTeamId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to find active players for fantasy team: ${error.message}`);
    }

    return (data || []) as FantasyTeamPlayer[];
  }

  async findByPlayer(playerId: string): Promise<FantasyTeamPlayer[]> {
    return this.findAll({ player_id: playerId } as Partial<FantasyTeamPlayer>);
  }

  async findCaptain(fantasyTeamId: string): Promise<FantasyTeamPlayer | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('fantasy_team_id', fantasyTeamId)
      .eq('is_captain', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find captain: ${error.message}`);
    }

    return data as FantasyTeamPlayer;
  }
}


