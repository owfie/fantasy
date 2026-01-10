/**
 * Value Tracking Service
 * Handles player value lookups by week and team value calculations
 */

import { UnitOfWork } from '../unit-of-work';
import { ValueChange } from '../types';

export class ValueTrackingService {
  constructor(private uow: UnitOfWork) {}

  /**
   * Get a player's value for a specific week
   * Uses value_changes table (which uses round numbers)
   * If no value change exists for that round, uses the most recent previous value
   * If no value changes exist at all, uses starting_value from season_players
   */
  async getPlayerValueForWeek(playerId: string, weekNumber: number, seasonId: string): Promise<number> {
    // Get the player's value changes up to and including this week's round
    const valueChanges = await this.uow.valueChanges.findByPlayer(playerId);
    
    // Find the value change for this round or the most recent previous round
    const relevantValueChange = valueChanges
      .filter(vc => vc.round <= weekNumber)
      .sort((a, b) => b.round - a.round)[0];

    if (relevantValueChange) {
      return relevantValueChange.value;
    }

    // No value changes found - use starting value from season_players
    const seasonPlayer = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
    if (seasonPlayer) {
      return seasonPlayer.starting_value;
    }

    // Fallback to player's starting_value
    const player = await this.uow.players.findById(playerId);
    if (player) {
      return player.starting_value;
    }

    return 0;
  }

  /**
   * Get player values for multiple players at a specific week
   */
  async getPlayerValuesForWeek(
    playerIds: string[],
    weekNumber: number,
    seasonId: string
  ): Promise<Map<string, number>> {
    const values = new Map<string, number>();

    // Get all value changes for these players
    const allValueChanges = await Promise.all(
      playerIds.map(id => this.uow.valueChanges.findByPlayer(id))
    );

    // Get season players for starting values
    const seasonPlayers = await Promise.all(
      playerIds.map(id => this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, id))
    );

    // Get players for fallback
    const players = await Promise.all(
      playerIds.map(id => this.uow.players.findById(id))
    );

    for (let i = 0; i < playerIds.length; i++) {
      const playerId = playerIds[i];
      const valueChanges = allValueChanges[i];
      const seasonPlayer = seasonPlayers[i];
      const player = players[i];

      // Find relevant value change
      const relevantValueChange = valueChanges
        .filter(vc => vc.round <= weekNumber)
        .sort((a, b) => b.round - a.round)[0];

      if (relevantValueChange) {
        values.set(playerId, relevantValueChange.value);
      } else if (seasonPlayer) {
        values.set(playerId, seasonPlayer.starting_value);
      } else if (player) {
        values.set(playerId, player.starting_value);
      } else {
        values.set(playerId, 0);
      }
    }

    return values;
  }

  /**
   * Calculate total team value for a week based on player IDs and their values at that week
   */
  async calculateTeamValueForWeek(
    playerIds: string[],
    weekNumber: number,
    seasonId: string
  ): Promise<number> {
    const values = await this.getPlayerValuesForWeek(playerIds, weekNumber, seasonId);
    return Array.from(values.values()).reduce((sum, value) => sum + value, 0);
  }

  /**
   * Update fantasy team's total_value based on current player values
   * Uses the latest round's values
   */
  async updateTeamValue(fantasyTeamId: string): Promise<number> {
    const fantasyTeam = await this.uow.fantasyTeams.findById(fantasyTeamId);
    if (!fantasyTeam) {
      throw new Error('Fantasy team not found');
    }

    // Get current players on the team
    const teamPlayers = await this.uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
    const playerIds = teamPlayers.map(tp => tp.player_id);

    if (playerIds.length === 0) {
      return 0;
    }

    // Get current round (latest round with value changes)
    const currentRound = await this.uow.valueChanges.getCurrentRound();
    
    // If no value changes exist, use starting values
    if (currentRound === null) {
      const values = await this.getPlayerValuesForWeek(playerIds, 0, fantasyTeam.season_id);
      const totalValue = Array.from(values.values()).reduce((sum, value) => sum + value, 0);
      
      // Update the team
      await this.uow.fantasyTeams.update({
        id: fantasyTeamId,
        total_value: totalValue,
      });

      return totalValue;
    }

    // Use current round values
    const totalValue = await this.calculateTeamValueForWeek(
      playerIds,
      currentRound,
      fantasyTeam.season_id
    );

    // Update the team
    await this.uow.fantasyTeams.update({
      id: fantasyTeamId,
      total_value: totalValue,
    });

    return totalValue;
  }

  /**
   * Get week-on-week value changes for a player
   * Returns a map of week number to value
   */
  async getWeekOnWeekValues(playerId: string, seasonId: string, maxWeek: number): Promise<Map<number, number>> {
    const values = new Map<number, number>();
    
    // Get starting value
    const seasonPlayer = await this.uow.seasonPlayers.findBySeasonAndPlayer(seasonId, playerId);
    const startingValue = seasonPlayer?.starting_value ?? 0;

    // Get all value changes
    const valueChanges = await this.uow.valueChanges.findByPlayer(playerId);
    
    // Build map: for each week, use the most recent value change up to that week
    let currentValue = startingValue;
    
    for (let week = 1; week <= maxWeek; week++) {
      // Find value change for this week or most recent previous
      const relevantChange = valueChanges
        .filter(vc => vc.round <= week)
        .sort((a, b) => b.round - a.round)[0];

      if (relevantChange) {
        currentValue = relevantChange.value;
      }
      
      values.set(week, currentValue);
    }

    return values;
  }
}

