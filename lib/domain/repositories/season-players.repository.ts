import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { SeasonPlayer, InsertSeasonPlayer, UpdateSeasonPlayer, Player, Team } from '../types';

export interface SeasonPlayerWithPlayer extends SeasonPlayer {
  player: Player;
  team?: Team;
}

export class SeasonPlayersRepository extends BaseRepository<SeasonPlayer, InsertSeasonPlayer, UpdateSeasonPlayer> {
  constructor(client: SupabaseClient) {
    super(client, 'season_players');
  }

  /**
   * Find all players for a given season
   */
  async findBySeason(seasonId: string): Promise<SeasonPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('season_id', seasonId)
      .order('starting_value', { ascending: false });

    if (error) {
      throw new Error(`Failed to find players for season: ${error.message}`);
    }

    return (data || []) as SeasonPlayer[];
  }

  /**
   * Find all players for a season with player and team details
   */
  async findBySeasonWithPlayers(seasonId: string): Promise<SeasonPlayerWithPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        player:players(*),
        team:teams(*)
      `)
      .eq('season_id', seasonId)
      .order('starting_value', { ascending: false });

    if (error) {
      throw new Error(`Failed to find players for season with details: ${error.message}`);
    }

    return (data || []) as SeasonPlayerWithPlayer[];
  }

  /**
   * Find all seasons for a given player
   */
  async findByPlayer(playerId: string): Promise<SeasonPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find seasons for player: ${error.message}`);
    }

    return (data || []) as SeasonPlayer[];
  }

  /**
   * Find a specific season-player combination
   */
  async findBySeasonAndPlayer(seasonId: string, playerId: string): Promise<SeasonPlayer | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find season-player: ${error.message}`);
    }

    return data as SeasonPlayer;
  }

  /**
   * Batch fetch season-player records for multiple players in one query
   * Returns a Map of player_id -> SeasonPlayer
   */
  async findBySeasonAndPlayers(seasonId: string, playerIds: string[]): Promise<Map<string, SeasonPlayer>> {
    if (playerIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('season_id', seasonId)
      .in('player_id', playerIds);

    if (error) {
      throw new Error(`Failed to find season-players: ${error.message}`);
    }

    const result = new Map<string, SeasonPlayer>();
    for (const sp of (data || []) as SeasonPlayer[]) {
      result.set(sp.player_id, sp);
    }

    return result;
  }

  /**
   * Find active players for a season
   */
  async findActiveBySeason(seasonId: string): Promise<SeasonPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .order('starting_value', { ascending: false });

    if (error) {
      throw new Error(`Failed to find active players for season: ${error.message}`);
    }

    return (data || []) as SeasonPlayer[];
  }

  /**
   * Bulk add players to a season with optional team assignment
   */
  async addPlayersToSeason(seasonId: string, players: Array<{ playerId: string; startingValue: number; teamId?: string }>): Promise<SeasonPlayer[]> {
    const inserts: InsertSeasonPlayer[] = players.map(p => ({
      season_id: seasonId,
      player_id: p.playerId,
      team_id: p.teamId,
      starting_value: p.startingValue,
      is_active: true,
    }));

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(inserts)
      .select();

    if (error) {
      throw new Error(`Failed to add players to season: ${error.message}`);
    }

    return (data || []) as SeasonPlayer[];
  }

  /**
   * Update a player's team assignment for a season
   */
  async updateTeam(seasonId: string, playerId: string, teamId: string | null): Promise<SeasonPlayer> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ team_id: teamId })
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update player team assignment: ${error.message}`);
    }

    return data as SeasonPlayer;
  }

  /**
   * Remove a player from a season
   */
  async removeFromSeason(seasonId: string, playerId: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('season_id', seasonId)
      .eq('player_id', playerId);

    if (error) {
      throw new Error(`Failed to remove player from season: ${error.message}`);
    }
  }

  /**
   * Update a player's status in a season (active/inactive)
   */
  async setPlayerActive(seasonId: string, playerId: string, isActive: boolean): Promise<SeasonPlayer> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ is_active: isActive })
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update player active status: ${error.message}`);
    }

    return data as SeasonPlayer;
  }

  /**
   * Update a player's starting value for a season
   */
  async updateStartingValue(seasonId: string, playerId: string, startingValue: number): Promise<SeasonPlayer> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ starting_value: startingValue })
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update player starting value: ${error.message}`);
    }

    return data as SeasonPlayer;
  }
}

