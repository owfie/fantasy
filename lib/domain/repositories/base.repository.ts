/**
 * Base repository interface and implementation
 * Provides common CRUD operations for all entities
 */

import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

export interface IRepository<T, TInsert, TUpdate> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: TInsert): Promise<T>;
  createMany(data: TInsert[]): Promise<T[]>;
  update(data: TUpdate): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: Partial<T>): Promise<number>;
}

export abstract class BaseRepository<T, TInsert, TUpdate> implements IRepository<T, TInsert, TUpdate> {
  protected client: SupabaseClient;
  protected tableName: string;

  constructor(client: SupabaseClient, tableName: string) {
    this.client = client;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to find ${this.tableName} by id: ${error.message}`);
    }

    return data as T;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    let query = this.client.from(this.tableName).select('*');

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find all ${this.tableName}: ${error.message}`);
    }

    return (data || []) as T[];
  }

  async create(data: TInsert): Promise<T> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(data as TInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    }

    return result as T;
  }

  async createMany(data: TInsert[]): Promise<T[]> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(data as TInsert[])
      .select();

    if (error) {
      throw new Error(`Failed to create many ${this.tableName}: ${error.message}`);
    }

    return (result || []) as T[];
  }

  async update(data: TUpdate): Promise<T> {
    // Extract id and rest of data - TUpdate should have id
    const { id, ...updateData } = data as TUpdate & { id: string };

    // Filter out undefined values - Supabase doesn't handle undefined
    // Keep null values (they're used to clear fields)
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(cleanUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    }

    return result as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
    }
  }

  async count(filter?: Partial<T>): Promise<number> {
    let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count ${this.tableName}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Execute a custom query
   */
  protected async query<R = T>(queryFn: (client: SupabaseClient) => Promise<{ data: R | null; error: PostgrestError | null }>): Promise<R> {
    const { data, error } = await queryFn(this.client);

    if (error) {
      throw new Error(`Query failed on ${this.tableName}: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Query returned no data for ${this.tableName}`);
    }

    return data;
  }
}


