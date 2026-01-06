/**
 * Teams Service
 * Business logic for team operations
 * Extends BaseCrudService for reusable CRUD operations
 */

import { UnitOfWork } from '../unit-of-work';
import { BaseCrudService } from './base-crud.service';
import { Team, InsertTeam, UpdateTeam, Game } from '../types';

export class TeamsService extends BaseCrudService<Team, InsertTeam, UpdateTeam> {
  constructor(uow: UnitOfWork) {
    super(uow, uow.teams);
  }

  /**
   * Create team with validation
   */
  async create(data: InsertTeam): Promise<Team> {
    return this.uow.execute(async () => {
      // Check if team with same name already exists
      const existing = await this.uow.teams.findByName(data.name);
      if (existing) {
        throw new Error(`Team with name "${data.name}" already exists`);
      }

      return await this.repository.create(data);
    });
  }

  /**
   * Update team with validation
   */
  async update(data: UpdateTeam): Promise<Team> {
    return this.uow.execute(async () => {
      const existing = await this.repository.findById(data.id);
      if (!existing) {
        throw new Error('Team not found');
      }

      // If name is being changed, check for duplicates
      if (data.name && data.name !== existing.name) {
        const duplicate = await this.uow.teams.findByName(data.name);
        if (duplicate) {
          throw new Error(`Team with name "${data.name}" already exists`);
        }
      }

      return await this.repository.update(data);
    });
  }

  /**
   * Soft delete - mark team as deleted (set deleted_at timestamp)
   */
  async deleteSoft(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const team = await this.repository.findById(id);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if already deleted
      if (team.deleted_at) {
        throw new Error('Team is already deleted');
      }

      // Set deleted_at timestamp
      await this.repository.update({
        id,
        deleted_at: new Date().toISOString(),
      } as UpdateTeam);
    });
  }

  /**
   * Restore a soft-deleted team
   */
  async restore(id: string): Promise<Team> {
    return this.uow.execute(async () => {
      const team = await this.repository.findById(id);
      if (!team) {
        throw new Error('Team not found');
      }

      if (!team.deleted_at) {
        throw new Error('Team is not deleted');
      }

      // Clear deleted_at by setting it to null
      // Use direct Supabase update to set null explicitly
      const { data, error } = await this.uow.getClient()
        .from('teams')
        .update({ deleted_at: null })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to restore team: ${error.message}`);
      }

      if (!data) {
        throw new Error('Team not found after restore');
      }

      return data as Team;
    });
  }

  /**
   * Hard delete - permanently remove team
   */
  async deleteHard(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const team = await this.repository.findById(id);
      if (!team) {
        throw new Error('Team not found');
      }

      // Validate: check if team has players
      const players = await this.uow.players.findByTeam(id);
      if (players.length > 0) {
        throw new Error('Cannot delete team with players. Remove all players first.');
      }

      // Check if team has games
      const homeGames = await this.uow.games.findAll({ home_team_id: id } as Partial<Game>);
      const awayGames = await this.uow.games.findAll({ away_team_id: id } as Partial<Game>);
      if (homeGames.length > 0 || awayGames.length > 0) {
        throw new Error('Cannot delete team with games. Remove all games first.');
      }

      await this.repository.delete(id);
    });
  }

  /**
   * Find team by name
   */
  async findByName(name: string, includeDeleted = false): Promise<Team | null> {
    return await this.uow.teams.findByName(name, includeDeleted);
  }

  /**
   * Find all teams, including soft-deleted ones (for admin view)
   */
  async findAllIncludingDeleted(): Promise<Team[]> {
    return await this.uow.teams.findAllIncludingDeleted();
  }
}

