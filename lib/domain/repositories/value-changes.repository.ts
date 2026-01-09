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
   */
  async getCurrentRound(): Promise<number | null> {
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
   */
  async getPlayerPricesForRound(round: number): Promise<PlayerWithPrices[]> {
    const { data, error } = await this.client
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
      .eq('round', round)
      .order('value', { ascending: false });

    if (error) {
      throw new Error(`Failed to get player prices: ${error.message}`);
    }

    // Get previous round values
    const previousRound = round - 1;
    const { data: previousData } = await this.client
      .from(this.tableName)
      .select('player_id, value')
      .eq('round', previousRound);

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
   */
  async getCurrentPlayerPrices(): Promise<PlayerWithPrices[]> {
    const currentRound = await this.getCurrentRound();
    
    if (currentRound === null) {
      // No value changes yet - fall back to starting values from players table
      const { data, error } = await this.client
        .from('players')
        .select(`
          id,
          first_name,
          last_name,
          starting_value,
          is_active,
          teams(name)
        `)
        .eq('is_active', true)
        .order('starting_value', { ascending: false });

      if (error) {
        throw new Error(`Failed to get player starting values: ${error.message}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((player: any) => {
        const team = player?.teams;
        return {
          player_id: player.id,
          first_name: player.first_name ?? '',
          last_name: player.last_name ?? '',
          team_name: team?.name ?? null,
          current_value: player.starting_value ?? 0,
          previous_value: null,
          change: null,
        };
      });
    }

    return this.getPlayerPricesForRound(currentRound);
  }
}

