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
   * Get all player points grouped by week for a season
   */
  async getPlayerPointsByWeek(seasonId: string): Promise<Map<string, Map<string, number>>> {
    const client = this.uow.getClient();

    // Get all weeks for this season
    const weeks = await this.uow.weeks.findBySeason(seasonId);
    const weekIds = weeks.map(w => w.id);

    if (weekIds.length === 0) {
      return new Map();
    }

    // Get all player stats with game and week info
    const { data: statsWithGames, error } = await client
      .from('player_stats')
      .select(`
        player_id,
        points,
        game_id,
        games!inner(week_id)
      `);

    if (error) {
      throw new Error(`Failed to fetch player stats: ${error.message}`);
    }

    // Build map: playerId -> weekId -> totalPoints
    const playerWeekPoints = new Map<string, Map<string, number>>();

    interface StatWithGame {
      player_id: string;
      points: number;
      games?: { week_id: string };
    }

    for (const stat of (statsWithGames || []) as unknown as StatWithGame[]) {
      const weekId = stat.games?.week_id;
      if (!weekId || !weekIds.includes(weekId)) continue;

      if (!playerWeekPoints.has(stat.player_id)) {
        playerWeekPoints.set(stat.player_id, new Map());
      }

      const weekMap = playerWeekPoints.get(stat.player_id)!;
      const currentPoints = weekMap.get(weekId) || 0;
      weekMap.set(weekId, currentPoints + (stat.points || 0));
    }

    return playerWeekPoints;
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

    // Get all player points by week
    const playerWeekPoints = await this.getPlayerPointsByWeek(seasonId);

    // Build price rows for each player
    const priceRows: PlayerPriceRow[] = [];

    for (let i = 0; i < seasonPlayers.length; i++) {
      const seasonPlayer = seasonPlayers[i];
      const player = players[i];
      if (!player) continue;

      const team = seasonPlayer.team_id ? teamsMap.get(seasonPlayer.team_id) : null;
      const startingPrice = seasonPlayer.starting_value;

      // Get this player's points by week
      const weekPoints = playerWeekPoints.get(player.id) || new Map<string, number>();

      // Calculate prices for each week
      const weekData = new Map<number, PlayerWeekData>();
      let previousPrice = startingPrice;
      const pointsHistory: number[] = [];

      for (const week of sortedWeeks) {
        const weekNumber = week.week_number;
        const points = weekPoints.get(week.id) || 0;
        pointsHistory.push(points);

        // Calculate new price based on formula
        // Week 2 uses week 1 points only, Week 3+ uses 2-week average
        let twoWeekAvg: number;
        if (pointsHistory.length === 1) {
          // First week with points - price stays at starting
          twoWeekAvg = points;
        } else if (pointsHistory.length === 2) {
          // Second week - use only first week's points for price calculation
          twoWeekAvg = pointsHistory[0];
        } else {
          // Third week onwards - use average of previous 2 weeks
          twoWeekAvg = (pointsHistory[pointsHistory.length - 2] + pointsHistory[pointsHistory.length - 3]) / 2;
        }

        // Calculate price for this week (price at start of week, based on previous performance)
        let price: number;
        if (weekNumber === 1) {
          // Week 1: use starting price
          price = startingPrice;
        } else {
          // Week 2+: calculate from previous price and points
          price = this.calculateNewPrice(previousPrice, twoWeekAvg);
        }

        weekData.set(weekNumber, { points, price });
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
