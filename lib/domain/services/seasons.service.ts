/**
 * Seasons Service
 * Business logic for season operations
 * Extends BaseCrudService for reusable CRUD operations
 */

import { UnitOfWork } from '../unit-of-work';
import { BaseCrudService } from './base-crud.service';
import { Season, InsertSeason, UpdateSeason, SeasonPlayer, InsertSeasonPlayer } from '../types';
import { SeasonPlayerWithPlayer } from '../repositories';

export class SeasonsService extends BaseCrudService<Season, InsertSeason, UpdateSeason> {
  constructor(uow: UnitOfWork) {
    super(uow, uow.seasons);
  }

  /**
   * Create season with validation
   */
  async create(data: InsertSeason): Promise<Season> {
    return this.uow.execute(async () => {
      // Validate dates
      if (new Date(data.start_date) >= new Date(data.end_date)) {
        throw new Error('Start date must be before end date');
      }

      // Check for overlapping active seasons
      if (data.is_active) {
        const activeSeason = await this.uow.seasons.findActive();
        if (activeSeason) {
          throw new Error(`There is already an active season: "${activeSeason.name}". Deactivate it first or create an inactive season.`);
        }
      }

      return await this.repository.create(data);
    });
  }

  /**
   * Update season with validation
   */
  async update(data: UpdateSeason): Promise<Season> {
    return this.uow.execute(async () => {
      const existing = await this.repository.findById(data.id);
      if (!existing) {
        throw new Error('Season not found');
      }

      // Validate dates if both are provided or one is changed
      const startDate = data.start_date || existing.start_date;
      const endDate = data.end_date || existing.end_date;
      if (new Date(startDate) >= new Date(endDate)) {
        throw new Error('Start date must be before end date');
      }

      // If activating this season, deactivate any other active season
      if (data.is_active === true && !existing.is_active) {
        const activeSeason = await this.uow.seasons.findActive();
        if (activeSeason && activeSeason.id !== data.id) {
          await this.repository.update({ id: activeSeason.id, is_active: false });
        }
      }

      return await this.repository.update(data);
    });
  }

  /**
   * Soft delete - mark season as inactive
   */
  async deleteSoft(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const season = await this.repository.findById(id);
      if (!season) {
        throw new Error('Season not found');
      }

      await this.repository.update({
        id,
        is_active: false,
      });
    });
  }

  /**
   * Hard delete - permanently remove season
   */
  async deleteHard(id: string): Promise<void> {
    return this.uow.execute(async () => {
      const season = await this.repository.findById(id);
      if (!season) {
        throw new Error('Season not found');
      }

      // Check if season has weeks
      const weeks = await this.uow.weeks.findBySeason(id);
      if (weeks.length > 0) {
        throw new Error('Cannot delete season with weeks. Remove all weeks first.');
      }

      // Check if season has players assigned
      const seasonPlayers = await this.uow.seasonPlayers.findBySeason(id);
      if (seasonPlayers.length > 0) {
        throw new Error('Cannot delete season with assigned players. Remove all player assignments first.');
      }

      await this.repository.delete(id);
    });
  }

  /**
   * Get the active season
   */
  async findActive(): Promise<Season | null> {
    return await this.uow.seasons.findActive();
  }

  /**
   * Set a season as active (deactivates others)
   */
  async setActive(id: string): Promise<Season> {
    return this.uow.execute(async () => {
      const season = await this.repository.findById(id);
      if (!season) {
        throw new Error('Season not found');
      }

      // Deactivate any currently active season
      const activeSeason = await this.uow.seasons.findActive();
      if (activeSeason && activeSeason.id !== id) {
        await this.repository.update({ id: activeSeason.id, is_active: false });
      }

      // Activate this season
      return await this.repository.update({ id, is_active: true });
    });
  }

  // ============================================
  // Season Player Management
  // ============================================

  /**
   * Get all players for a season with their details
   */
  async getSeasonPlayers(seasonId: string): Promise<SeasonPlayerWithPlayer[]> {
    return await this.uow.seasonPlayers.findBySeasonWithPlayers(seasonId);
  }

  /**
   * Add a player to a season with optional team assignment
   */
  async addPlayerToSeason(seasonId: string, playerId: string, startingValue: number, teamId?: string): Promise<SeasonPlayer> {
    return this.uow.execute(async () => {
      // Verify season exists
      const season = await this.repository.findById(seasonId);
      if (!season) {
        throw new Error('Season not found');
      }

      // Verify player exists
      const player = await this.uow.players.findById(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      // Verify team exists if provided
      if (teamId) {
        const team = await this.uow.teams.findById(teamId);
        if (!team) {
          throw new Error('Team not found');
        }
      }

      // Check if already added
      const existing = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
      if (existing) {
        throw new Error('Player is already in this season');
      }

      const data: InsertSeasonPlayer = {
        season_id: seasonId,
        player_id: playerId,
        team_id: teamId,
        starting_value: startingValue,
        is_active: true,
      };

      return await this.uow.seasonPlayers.create(data);
    });
  }

  /**
   * Add multiple players to a season with optional team assignments
   */
  async addPlayersToSeason(seasonId: string, players: Array<{ playerId: string; startingValue: number; teamId?: string }>): Promise<SeasonPlayer[]> {
    return this.uow.execute(async () => {
      // Verify season exists
      const season = await this.repository.findById(seasonId);
      if (!season) {
        throw new Error('Season not found');
      }

      return await this.uow.seasonPlayers.addPlayersToSeason(seasonId, players);
    });
  }

  /**
   * Update a player's team assignment for a season
   */
  async updatePlayerTeam(seasonId: string, playerId: string, teamId: string | null): Promise<SeasonPlayer> {
    return this.uow.execute(async () => {
      const existing = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
      if (!existing) {
        throw new Error('Player is not in this season');
      }

      // Verify team exists if provided
      if (teamId) {
        const team = await this.uow.teams.findById(teamId);
        if (!team) {
          throw new Error('Team not found');
        }
      }

      return await this.uow.seasonPlayers.updateTeam(seasonId, playerId, teamId);
    });
  }

  /**
   * Remove a player from a season
   */
  async removePlayerFromSeason(seasonId: string, playerId: string): Promise<void> {
    return this.uow.execute(async () => {
      const existing = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
      if (!existing) {
        throw new Error('Player is not in this season');
      }

      await this.uow.seasonPlayers.removeFromSeason(seasonId, playerId);
    });
  }

  /**
   * Update a player's starting value for a season
   */
  async updatePlayerValue(seasonId: string, playerId: string, startingValue: number): Promise<SeasonPlayer> {
    return this.uow.execute(async () => {
      const existing = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
      if (!existing) {
        throw new Error('Player is not in this season');
      }

      return await this.uow.seasonPlayers.updateStartingValue(seasonId, playerId, startingValue);
    });
  }

  /**
   * Set a player's active status for a season
   */
  async setPlayerActive(seasonId: string, playerId: string, isActive: boolean): Promise<SeasonPlayer> {
    return this.uow.execute(async () => {
      const existing = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
      if (!existing) {
        throw new Error('Player is not in this season');
      }

      return await this.uow.seasonPlayers.setPlayerActive(seasonId, playerId, isActive);
    });
  }

  /**
   * Copy players from one season to another (for new season setup)
   * Preserves team assignments from the source season
   */
  async copyPlayersFromSeason(fromSeasonId: string, toSeasonId: string, valueMultiplier: number = 1): Promise<SeasonPlayer[]> {
    return this.uow.execute(async () => {
      // Verify both seasons exist
      const fromSeason = await this.repository.findById(fromSeasonId);
      if (!fromSeason) {
        throw new Error('Source season not found');
      }

      const toSeason = await this.repository.findById(toSeasonId);
      if (!toSeason) {
        throw new Error('Target season not found');
      }

      // Get players from source season
      const sourcePlayers = await this.uow.seasonPlayers.findBySeason(fromSeasonId);
      if (sourcePlayers.length === 0) {
        return [];
      }

      // Prepare players with adjusted values and preserved team assignments
      const playersToAdd = sourcePlayers.map(sp => ({
        playerId: sp.player_id,
        teamId: sp.team_id,  // Preserve team from source season
        startingValue: sp.starting_value * valueMultiplier,
      }));

      return await this.uow.seasonPlayers.addPlayersToSeason(toSeasonId, playersToAdd);
    });
  }
}

