import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Team, InsertTeam, UpdateTeam } from '../types';

export class TeamsRepository extends BaseRepository<Team, InsertTeam, UpdateTeam> {
  constructor(client: SupabaseClient) {
    super(client, 'teams');
  }

  async findByName(name: string, includeDeleted = false): Promise<Team | null> {
    let query = this.client
      .from(this.tableName)
      .select('*')
      .eq('name', name);

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find team by name: ${error.message}`);
    }

    return data as Team;
  }

  /**
   * Find all teams, optionally including deleted ones
   * Overrides base findAll to support includeDeleted parameter
   */
  async findAll(filter?: Partial<Team>): Promise<Team[]> {
    let query = this.client.from(this.tableName).select('*');

    // Apply filter if provided (excluding deleted_at from filter)
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'deleted_at') {
          query = query.eq(key, value);
        }
      });
    } else {
      // If no filter, exclude deleted teams by default
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find all teams: ${error.message}`);
    }

    return (data || []) as Team[];
  }

  /**
   * Find all teams including soft-deleted ones (for admin view)
   */
  async findAllIncludingDeleted(): Promise<Team[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .order('deleted_at', { ascending: true, nullsFirst: true });

    if (error) {
      throw new Error(`Failed to find all teams: ${error.message}`);
    }

    return (data || []) as Team[];
  }
}


