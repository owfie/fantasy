/**
 * Fantasy Team Domain Service
 * Business logic for fantasy team operations
 */

import { UnitOfWork } from '../unit-of-work';
import { InsertFantasyTeam, FantasyTeam, SeasonPlayer } from '../types';

export class FantasyTeamService {
  constructor(private uow: UnitOfWork) {}

  /**
   * Validate that a player is registered for a given season
   */
  private async validatePlayerInSeason(playerId: string, seasonId: string): Promise<SeasonPlayer> {
    const seasonPlayer = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
    if (!seasonPlayer) {
      throw new Error('Player is not registered for this season. Please add the player to the season first.');
    }
    if (!seasonPlayer.is_active) {
      throw new Error('Player is not active in this season.');
    }
    return seasonPlayer;
  }

  /**
   * Get the season ID for a fantasy team
   */
  private async getFantasyTeamSeasonId(fantasyTeamId: string): Promise<string> {
    const team = await this.uow.fantasyTeams.findById(fantasyTeamId);
    if (!team) {
      throw new Error('Fantasy team not found');
    }
    return team.season_id;
  }

  /**
   * Create a fantasy team with initial players
   * This is a transactional operation
   * Validates that all players are registered for the season
   */
  async createFantasyTeamWithPlayers(
    teamData: InsertFantasyTeam,
    players: Array<{ playerId: string; isCaptain?: boolean; isReserve?: boolean; draftRound?: number; draftPick?: number }>
  ): Promise<FantasyTeam> {
    return this.uow.execute(async (uow) => {
      // Validate all players are registered for the season before creating the team
      for (const player of players) {
        await this.validatePlayerInSeason(player.playerId, teamData.season_id);
      }
      
      // Create the fantasy team
      const fantasyTeam = await uow.fantasyTeams.create(teamData);

      // Add players to the team
      const playerInserts = players.map((p) => ({
        fantasy_team_id: fantasyTeam.id,
        player_id: p.playerId,
        is_captain: p.isCaptain || false,
        is_reserve: p.isReserve || false,
        is_active: true,
        draft_round: p.draftRound,
        draft_pick: p.draftPick,
      }));

      await uow.fantasyTeamPlayers.createMany(playerInserts);

      // Update total value using season-specific values
      const totalValue = await this.calculateTeamValue(fantasyTeam.id);
      await uow.fantasyTeams.update({
        id: fantasyTeam.id,
        total_value: totalValue,
        original_value: totalValue,
      });

      return await uow.fantasyTeams.findById(fantasyTeam.id) as FantasyTeam;
    });
  }

  /**
   * Calculate total value of a fantasy team using season-specific player values
   */
  async calculateTeamValue(fantasyTeamId: string): Promise<number> {
    const players = await this.uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
    const playerIds = players.map((p) => p.player_id);

    if (playerIds.length === 0) {
      return 0;
    }

    // Get the season ID for this fantasy team
    const seasonId = await this.getFantasyTeamSeasonId(fantasyTeamId);

    // Use season_players.starting_value for season-specific values
    const { data, error } = await this.uow.getClient()
      .from('season_players')
      .select('starting_value')
      .eq('season_id', seasonId)
      .in('player_id', playerIds);

    if (error) {
      throw new Error(`Failed to calculate team value: ${error.message}`);
    }

    return (data || []).reduce((sum, p) => sum + (p.starting_value || 0), 0);
  }

  /**
   * Add a player to a fantasy team
   * Validates that the player is registered for the fantasy team's season
   */
  async addPlayerToTeam(
    fantasyTeamId: string,
    playerId: string,
    options?: { isCaptain?: boolean; isReserve?: boolean; draftRound?: number; draftPick?: number }
  ): Promise<void> {
    await this.uow.execute(async (uow) => {
      // Get the season for this fantasy team
      const seasonId = await this.getFantasyTeamSeasonId(fantasyTeamId);
      
      // Validate player is registered for the season (this will throw if not)
      await this.validatePlayerInSeason(playerId, seasonId);
      
      // Check if player already exists on team
      const existing = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
      if (existing.some((p) => p.player_id === playerId)) {
        throw new Error('Player already exists on this team');
      }

      // Add player
      await uow.fantasyTeamPlayers.create({
        fantasy_team_id: fantasyTeamId,
        player_id: playerId,
        is_captain: options?.isCaptain || false,
        is_reserve: options?.isReserve || false,
        is_active: true,
        draft_round: options?.draftRound,
        draft_pick: options?.draftPick,
      });

      // Update team value using season-specific values
      const totalValue = await this.calculateTeamValue(fantasyTeamId);
      await uow.fantasyTeams.update({
        id: fantasyTeamId,
        total_value: totalValue,
      });
    });
  }

  /**
   * Remove a player from a fantasy team
   */
  async removePlayerFromTeam(fantasyTeamId: string, playerId: string): Promise<void> {
    await this.uow.execute(async (uow) => {
      const players = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
      const player = players.find((p) => p.player_id === playerId);

      if (!player) {
        throw new Error('Player not found on this team');
      }

      await uow.fantasyTeamPlayers.delete(player.id);

      // Update team value
      const totalValue = await this.calculateTeamValue(fantasyTeamId);
      await uow.fantasyTeams.update({
        id: fantasyTeamId,
        total_value: totalValue,
      });
    });
  }

  /**
   * Set team captain
   */
  async setCaptain(fantasyTeamId: string, playerId: string): Promise<void> {
    await this.uow.execute(async (uow) => {
      // Remove captain flag from all players
      const players = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
      for (const player of players) {
        if (player.is_captain) {
          await uow.fantasyTeamPlayers.update({
            id: player.id,
            is_captain: false,
          });
        }
      }

      // Set new captain
      const newCaptain = players.find((p) => p.player_id === playerId);
      if (!newCaptain) {
        throw new Error('Player not found on this team');
      }

      await uow.fantasyTeamPlayers.update({
        id: newCaptain.id,
        is_captain: true,
      });
    });
  }
}


