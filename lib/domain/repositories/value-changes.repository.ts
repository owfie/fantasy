import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { ValueChange, InsertValueChange, UpdateValueChange } from '../types';

export interface PlayerWithPrices {
  player_id: string;
  first_name: string;
  last_name: string;
  team_name: string | null;
  current_value: number;
  previous_value: number | null;
  change: number | null;
}

export class ValueChangesRepository extends BaseRepository<ValueChange, InsertValueChange, UpdateValueChange> {
  constructor(client: SupabaseClient) {
    super(client, 'value_changes');
  }

  async findByPlayer(playerId: string): Promise<ValueChange[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('player_id', playerId)
      .order('round', { ascending: false });

    if (error) {
      throw new Error(`Failed to find value changes: ${error.message}`);
    }

    return (data || []) as ValueChange[];
  }

  async findByRound(round: number): Promise<ValueChange[]> {
    return this.findAll({ round } as Partial<ValueChange>);
  }

  async findByPlayerAndRound(playerId: string, round: number): Promise<ValueChange | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('player_id', playerId)
      .eq('round', round)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find value change: ${error.message}`);
    }

    return data as ValueChange;
  }

  async findLatestByPlayer(playerId: string): Promise<ValueChange | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('player_id', playerId)
      .order('round', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find latest value change: ${error.message}`);
    }

    return data as ValueChange;
  }

  /**
   * Get current round (latest round with value changes)
   * If seasonId is provided, only considers players active in that season
   */
  async getCurrentRound(seasonId?: string): Promise<number | null> {
    if (seasonId) {
      // Get active player IDs for this season
      const { data: seasonPlayers, error: spError } = await this.client
        .from('season_players')
        .select('player_id')
        .eq('season_id', seasonId)
        .eq('is_active', true);

      if (spError) {
        throw new Error(`Failed to get season players: ${spError.message}`);
      }

      const activePlayerIds = (seasonPlayers || []).map((sp: { player_id: string }) => sp.player_id);

      if (activePlayerIds.length === 0) {
        return null;
      }

      // Get max round for players in this season
      const { data, error } = await this.client
        .from(this.tableName)
        .select('round')
        .in('player_id', activePlayerIds)
        .order('round', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get current round: ${error.message}`);
      }

      return data?.round ?? null;
    }

    // Fallback to global query if no seasonId
    const { data, error } = await this.client
      .from(this.tableName)
      .select('round')
      .order('round', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get current round: ${error.message}`);
    }

    return data?.round ?? null;
  }

  /**
   * Get all player prices for a specific round with player details
   * If seasonId is provided, only returns players active in that season
   */
  async getPlayerPricesForRound(round: number, seasonId?: string): Promise<PlayerWithPrices[]> {
    // If seasonId is provided, get active player IDs for that season first
    let activePlayerIds: string[] | undefined;
    if (seasonId) {
      const { data: seasonPlayers, error: spError } = await this.client
        .from('season_players')
        .select('player_id')
        .eq('season_id', seasonId)
        .eq('is_active', true);

      if (spError) {
        throw new Error(`Failed to get season players: ${spError.message}`);
      }

      activePlayerIds = (seasonPlayers || []).map((sp: { player_id: string }) => sp.player_id);
      
      // If no active players in season, return empty array
      if (activePlayerIds.length === 0) {
        return [];
      }
    }

    let query = this.client
      .from(this.tableName)
      .select(`
        player_id,
        round,
        value,
        players!inner(
          first_name,
          last_name,
          is_active,
          teams(name)
        )
      `)
      .eq('round', round);

    // Filter by active player IDs if seasonId provided
    if (activePlayerIds && activePlayerIds.length > 0) {
      query = query.in('player_id', activePlayerIds);
    }

    const { data, error } = await query.order('value', { ascending: false });

    if (error) {
      throw new Error(`Failed to get player prices: ${error.message}`);
    }

    // Get previous round values
    const previousRound = round - 1;
    let previousQuery = this.client
      .from(this.tableName)
      .select('player_id, value')
      .eq('round', previousRound);

    // Filter previous round values by season if seasonId provided
    if (activePlayerIds && activePlayerIds.length > 0) {
      previousQuery = previousQuery.in('player_id', activePlayerIds);
    }

    const { data: previousData } = await previousQuery;

    const previousValues = new Map(
      (previousData || []).map((v: { player_id: string; value: number }) => [v.player_id, v.value])
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => {
      const previousValue = previousValues.get(row.player_id) ?? null;
      const player = row.players;
      const team = player?.teams;
      return {
        player_id: row.player_id,
        first_name: player?.first_name ?? '',
        last_name: player?.last_name ?? '',
        team_name: team?.name ?? null,
        current_value: row.value,
        previous_value: previousValue,
        change: previousValue !== null ? row.value - previousValue : null,
      };
    });
  }

  /**
   * Get all player prices for the current round with previous week comparison
   * If seasonId is provided, only returns players active in that season
   */
  async getCurrentPlayerPrices(seasonId?: string): Promise<PlayerWithPrices[]> {
    const currentRound = await this.getCurrentRound(seasonId);

    if (currentRound === null) {
      // No value changes yet - fall back to starting values from season_players
      // If no seasonId, return empty array (no active season)
      if (!seasonId) {
        return [];
      }

      const { data, error } = await this.client
        .from('season_players')
        .select(`
          player_id,
          starting_value,
          players!inner(
            id,
            first_name,
            last_name,
            is_active,
            teams(name)
          )
        `)
        .eq('season_id', seasonId)
        .eq('is_active', true)
        .order('starting_value', { ascending: false });

      if (error) {
        throw new Error(`Failed to get player starting values: ${error.message}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((sp: any) => {
        const player = sp.players;
        const team = player?.teams;
        return {
          player_id: sp.player_id,
          first_name: player?.first_name ?? '',
          last_name: player?.last_name ?? '',
          team_name: team?.name ?? null,
          current_value: sp.starting_value ?? 0,
          previous_value: null,
          change: null,
        };
      });
    }

    return this.getPlayerPricesForRound(currentRound, seasonId);
  }

  /**
   * Get the highest round that has visible prices for users
   * Only returns rounds where the transfer window has been opened (prices are published)
   * This ensures users don't see "draft" prices that are calculated but not yet published
   */
  async getVisibleRound(seasonId: string): Promise<number | null> {
    // Get weeks that have had their transfer window opened (prices_calculated = true means it was processed)
    // AND either currently open or has been opened before
    const { data: visibleWeeks, error: weekError } = await this.client
      .from('weeks')
      .select('week_number')
      .eq('season_id', seasonId)
      .eq('prices_calculated', true)
      .order('week_number', { ascending: false })
      .limit(1);

    if (weekError) {
      throw new Error(`Failed to get visible weeks: ${weekError.message}`);
    }

    if (!visibleWeeks || visibleWeeks.length === 0) {
      return null;
    }

    // Return the highest week number where prices have been calculated
    return visibleWeeks[0].week_number;
  }

  /**
   * Get current player prices that are VISIBLE to users
   * Only shows prices from windows that have been published (prices_calculated = true)
   */
  async getVisiblePlayerPrices(seasonId: string): Promise<PlayerWithPrices[]> {
    const visibleRound = await this.getVisibleRound(seasonId);

    if (visibleRound === null) {
      // No visible prices yet - show starting values
      return this.getCurrentPlayerPrices(seasonId);
    }

    return this.getPlayerPricesForRound(visibleRound, seasonId);
  }
}

