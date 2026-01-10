import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { FantasyTeamSnapshotPlayer, InsertFantasyTeamSnapshotPlayer, UpdateFantasyTeamSnapshotPlayer, FantasyPosition } from '../types';

export class FantasyTeamSnapshotPlayersRepository extends BaseRepository<FantasyTeamSnapshotPlayer, InsertFantasyTeamSnapshotPlayer, UpdateFantasyTeamSnapshotPlayer> {
  constructor(client: SupabaseClient) {
    super(client, 'fantasy_team_snapshot_players');
  }

  async findBySnapshot(snapshotId: string): Promise<FantasyTeamSnapshotPlayer[]> {
    return this.findAll({ snapshot_id: snapshotId } as Partial<FantasyTeamSnapshotPlayer>);
  }

  async findByPlayer(playerId: string): Promise<FantasyTeamSnapshotPlayer[]> {
    return this.findAll({ player_id: playerId } as Partial<FantasyTeamSnapshotPlayer>);
  }

  async findBySnapshotAndPosition(snapshotId: string, position: FantasyPosition, isBenched: boolean): Promise<FantasyTeamSnapshotPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('snapshot_id', snapshotId)
      .eq('position', position)
      .eq('is_benched', isBenched);

    if (error) {
      throw new Error(`Failed to find snapshot players by position: ${error.message}`);
    }

    return (data || []) as FantasyTeamSnapshotPlayer[];
  }

  async findStartingLineup(snapshotId: string): Promise<FantasyTeamSnapshotPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('snapshot_id', snapshotId)
      .eq('is_benched', false);

    if (error) {
      throw new Error(`Failed to find starting lineup: ${error.message}`);
    }

    return (data || []) as FantasyTeamSnapshotPlayer[];
  }

  async findBench(snapshotId: string): Promise<FantasyTeamSnapshotPlayer[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('snapshot_id', snapshotId)
      .eq('is_benched', true);

    if (error) {
      throw new Error(`Failed to find bench: ${error.message}`);
    }

    return (data || []) as FantasyTeamSnapshotPlayer[];
  }

  async findCaptain(snapshotId: string): Promise<FantasyTeamSnapshotPlayer | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('snapshot_id', snapshotId)
      .eq('is_captain', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to find captain: ${error.message}`);
    }

    return data as FantasyTeamSnapshotPlayer;
  }
}

