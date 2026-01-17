/**
 * Price Calculation Service
 * Calculates player prices based on performance using the formula:
 * NewValue = PreviousValue + (10 * TwoWeekPointsAverage - PreviousValue) / 4
 */

import { UnitOfWork } from '../unit-of-work';
import { Week } from '../types';

export interface PlayerWeekData {
  points: number;
  price: number;
  played: boolean;
}

export interface PlayerPriceRow {
  playerId: string;
  playerName: string;
  teamName: string | null;
  teamColor: string | null;
  startingPrice: number;
  weekData: Map<number, PlayerWeekData>; // week_number -> data
}

export interface PriceTableData {
  players: PlayerPriceRow[];
  weeks: Week[];
}

export class PriceCalculationService {
  constructor(private uow: UnitOfWork) {}

  /**
   * Calculate new price from previous price and points average
   * Formula: NewValue = PreviousValue + (10 * TwoWeekPointsAverage - PreviousValue) / 4
   */
  calculateNewPrice(previousValue: number, twoWeekAvgPoints: number): number {
    const newValue = previousValue + (10 * twoWeekAvgPoints - previousValue) / 4;
    // Round to 2 decimal places
    return Math.round(newValue * 100) / 100;
  }

  /**
   * Get all player points and played status grouped by week for a season
   */
  async getPlayerPointsByWeek(seasonId: string): Promise<Map<string, Map<string, { points: number; played: boolean }>>> {
    const client = this.uow.getClient();

    // Get all weeks for this season
    const weeks = await this.uow.weeks.findBySeason(seasonId);
    const weekIds = weeks.map(w => w.id);

    if (weekIds.length === 0) {
      return new Map();
    }

    // Get all player stats with game and week info, including played status
    const { data: statsWithGames, error } = await client
      .from('player_stats')
      .select(`
        player_id,
        points,
        played,
        game_id,
        games!inner(week_id)
      `);

    if (error) {
      throw new Error(`Failed to fetch player stats: ${error.message}`);
    }

    // Build map: playerId -> weekId -> { points, played }
    const playerWeekData = new Map<string, Map<string, { points: number; played: boolean }>>();

    interface StatWithGame {
      player_id: string;
      points: number;
      played: boolean;
      games?: { week_id: string };
    }

    for (const stat of (statsWithGames || []) as unknown as StatWithGame[]) {
      const weekId = stat.games?.week_id;
      if (!weekId || !weekIds.includes(weekId)) continue;

      if (!playerWeekData.has(stat.player_id)) {
        playerWeekData.set(stat.player_id, new Map());
      }

      const weekMap = playerWeekData.get(stat.player_id)!;
      const currentData = weekMap.get(weekId) || { points: 0, played: false };

      // Aggregate points and track if player played in ANY game this week
      weekMap.set(weekId, {
        points: currentData.points + (stat.points || 0),
        played: currentData.played || stat.played === true
      });
    }

    return playerWeekData;
  }

  /**
   * Calculate full price table for all players across all weeks
   */
  async calculatePriceTable(seasonId: string): Promise<PriceTableData> {
    // Get all season players with their details
    const seasonPlayers = await this.uow.seasonPlayers.findBySeason(seasonId);

    // Get player details
    const playerIds = seasonPlayers.map(sp => sp.player_id);
    const players = await Promise.all(playerIds.map(id => this.uow.players.findById(id)));

    // Get teams for player team info
    const teamIds = [...new Set(seasonPlayers.map(sp => sp.team_id).filter(Boolean))] as string[];
    const teams = await Promise.all(teamIds.map(id => this.uow.teams.findById(id)));
    const teamsMap = new Map(teams.filter(Boolean).map(t => [t!.id, t!]));

    // Get weeks sorted by week number
    const weeks = await this.uow.weeks.findBySeason(seasonId);
    const sortedWeeks = weeks
      .filter(w => !w.is_draft_week)
      .sort((a, b) => a.week_number - b.week_number);

    // Create week number to ID mapping
    const weekIdToNumber = new Map(sortedWeeks.map(w => [w.id, w.week_number]));

    // Get all player points and played status by week
    const playerWeekData = await this.getPlayerPointsByWeek(seasonId);

    // Build price rows for each player
    const priceRows: PlayerPriceRow[] = [];

    for (let i = 0; i < seasonPlayers.length; i++) {
      const seasonPlayer = seasonPlayers[i];
      const player = players[i];
      if (!player) continue;

      const team = seasonPlayer.team_id ? teamsMap.get(seasonPlayer.team_id) : null;
      const startingPrice = seasonPlayer.starting_value;

      // Get this player's data by week
      const weekStats = playerWeekData.get(player.id) || new Map<string, { points: number; played: boolean }>();

      // Calculate prices for each week
      const weekData = new Map<number, PlayerWeekData>();
      let previousPrice = startingPrice;
      // Only track points from weeks where player actually played
      const playedPointsHistory: number[] = [];

      for (const week of sortedWeeks) {
        const weekNumber = week.week_number;
        const stats = weekStats.get(week.id);
        const points = stats?.points || 0;
        const played = stats?.played ?? false;

        // Calculate price for THIS week based on PREVIOUS played weeks
        // (we add current week to history AFTER calculating price)
        let price: number;
        if (weekNumber === 1) {
          // Week 1: use starting price
          price = startingPrice;
        } else if (playedPointsHistory.length === 0) {
          // No played weeks yet, carry forward starting price
          price = previousPrice;
        } else if (playedPointsHistory.length === 1) {
          // One played week available - use it for average
          price = this.calculateNewPrice(previousPrice, playedPointsHistory[0]);
        } else {
          // Two or more played weeks - use average of last 2 played weeks
          const lastTwo = playedPointsHistory.slice(-2);
          const twoWeekAvg = (lastTwo[0] + lastTwo[1]) / 2;
          price = this.calculateNewPrice(previousPrice, twoWeekAvg);
        }

        // AFTER calculating price, add current week to history if player actually played
        // This affects FUTURE week calculations, not the current week's price
        if (played) {
          playedPointsHistory.push(points);
        }

        weekData.set(weekNumber, { points, price, played });
        previousPrice = price;
      }

      priceRows.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        teamName: team?.name || null,
        teamColor: team?.color || null,
        startingPrice,
        weekData,
      });
    }

    // Sort by starting price descending
    priceRows.sort((a, b) => b.startingPrice - a.startingPrice);

    return {
      players: priceRows,
      weeks: sortedWeeks,
    };
  }

  /**
   * Save calculated prices to value_changes table
   */
  async saveCalculatedPrices(seasonId: string): Promise<{ saved: number }> {
    const priceTable = await this.calculatePriceTable(seasonId);
    let savedCount = 0;

    for (const playerRow of priceTable.players) {
      for (const [weekNumber, data] of playerRow.weekData) {
        // Only save week 2+ prices (week 1 uses starting price)
        if (weekNumber >= 2) {
          try {
            // Check if value change already exists
            const existing = await this.uow.valueChanges.findByPlayerAndRound(
              playerRow.playerId,
              weekNumber
            );

            if (existing) {
              // Update existing
              await this.uow.valueChanges.update({
                id: existing.id,
                value: data.price,
              });
            } else {
              // Create new
              await this.uow.valueChanges.create({
                player_id: playerRow.playerId,
                round: weekNumber,
                value: data.price,
              });
            }
            savedCount++;
          } catch (error) {
            console.error(`Failed to save price for player ${playerRow.playerId} week ${weekNumber}:`, error);
          }
        }
      }
    }

    return { saved: savedCount };
  }
}
