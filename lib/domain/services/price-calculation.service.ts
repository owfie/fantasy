/**
 * Price Calculation Service
 * Calculates player prices based on performance using the formula:
 * NewValue = PreviousValue + (10 * TwoWeekPointsAverage - PreviousValue) / 4
 *
 * Event-driven model:
 * - Prices are auto-calculated when stats are saved
 * - Calculated prices are saved to value_changes table
 * - Week is marked as prices_calculated = true
 * - Admin reviews prices, then opens transfer window
 */

import { UnitOfWork } from '../unit-of-work';
import { Week, TransferWindowStatus, getTransferWindowState } from '../types';

export interface PriceChange {
  playerId: string;
  playerName: string;
  teamName: string | null;
  currentPrice: number;
  newPrice: number;
  change: number;
}

export interface StatsUpdatePreview {
  affectedWindows: { weekNumber: number; state: 'upcoming' | 'ready' | 'open' | 'completed' }[];
  priceChanges: PriceChange[];
  hasOpenWindow: boolean;
}

export interface TransferWindowData {
  weekStats: { points: number; played: boolean } | null; // null for TW 0 (no stats)
  price: number; // Price resulting from the stats (or starting price for TW 0)
}

export interface PlayerPriceRow {
  playerId: string;
  playerName: string;
  teamName: string | null;
  teamColor: string | null;
  startingPrice: number;
  transferWindowData: Map<number, TransferWindowData>; // window_number -> data (TW 0, TW 1, TW 2...)
}

export interface PriceTableData {
  players: PlayerPriceRow[];
  weeks: Week[];
  maxWindowNumber: number;
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
   * Calculate full price table for all players across all transfer windows
   *
   * TW-centric model:
   * - TW 0: Starting prices (no stats, price = starting_value)
   * - TW N (N≥1): Price calculated from Week N stats + previous history
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

    // Get all player points and played status by week
    const playerWeekData = await this.getPlayerPointsByWeek(seasonId);

    // Determine max window number (TW 0 + one per week)
    const maxWindowNumber = sortedWeeks.length;

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

      // Build transfer window data
      const transferWindowData = new Map<number, TransferWindowData>();

      // TW 0: Starting price with no stats
      transferWindowData.set(0, {
        weekStats: null,
        price: startingPrice,
      });

      // TW N (N≥1): Price calculated from Week N stats
      let previousPrice = startingPrice;
      const playedPointsHistory: number[] = [];

      for (const week of sortedWeeks) {
        const windowNumber = week.week_number; // TW 1 = Week 1, TW 2 = Week 2, etc.
        const stats = weekStats.get(week.id);
        const points = stats?.points || 0;
        const played = stats?.played ?? false;

        // Calculate price for THIS transfer window
        let price: number;

        if (!played) {
          // Player didn't play this week - freeze price at previous value
          price = previousPrice;
        } else {
          // Player played - add to history and recalculate
          playedPointsHistory.push(points);

          if (playedPointsHistory.length === 1) {
            // First played week - use single week's points
            price = this.calculateNewPrice(previousPrice, playedPointsHistory[0]);
          } else {
            // Two or more played weeks - use average of last 2 played weeks
            const lastTwo = playedPointsHistory.slice(-2);
            const twoWeekAvg = (lastTwo[0] + lastTwo[1]) / 2;
            price = this.calculateNewPrice(previousPrice, twoWeekAvg);
          }
        }

        transferWindowData.set(windowNumber, {
          weekStats: { points, played },
          price,
        });

        previousPrice = price;
      }

      priceRows.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        teamName: team?.name || null,
        teamColor: team?.color || null,
        startingPrice,
        transferWindowData,
      });
    }

    // Sort by starting price descending
    priceRows.sort((a, b) => b.startingPrice - a.startingPrice);

    return {
      players: priceRows,
      weeks: sortedWeeks,
      maxWindowNumber,
    };
  }

  /**
   * Check if stats exist for a specific week (any player has stats for that week's games)
   */
  async hasStatsForWeek(seasonId: string, weekNumber: number): Promise<boolean> {
    const client = this.uow.getClient();

    // Get the week for this week number
    const weeks = await this.uow.weeks.findBySeason(seasonId);
    const week = weeks.find(w => w.week_number === weekNumber && !w.is_draft_week);

    if (!week) {
      return false;
    }

    // Check if any player_stats exist for games in this week
    const { data, error } = await client
      .from('player_stats')
      .select('id, games!inner(week_id)')
      .eq('games.week_id', week.id)
      .eq('played', true)
      .limit(1);

    if (error) {
      console.error(`Error checking stats for week ${weekNumber}:`, error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  }

  /**
   * Get calculation readiness for each transfer window
   */
  async getTransferWindowStatuses(seasonId: string): Promise<TransferWindowStatus[]> {
    const weeks = await this.uow.weeks.findBySeason(seasonId);
    const sortedWeeks = weeks
      .filter(w => !w.is_draft_week)
      .sort((a, b) => a.week_number - b.week_number);

    // Check which weeks have stats
    const statsPromises = sortedWeeks.map(w => this.hasStatsForWeek(seasonId, w.week_number));
    const statsResults = await Promise.all(statsPromises);

    // Check which windows have been calculated (have value_changes records)
    const client = this.uow.getClient();
    const { data: valueChanges } = await client
      .from('value_changes')
      .select('round')
      .order('round');

    const calculatedRounds = new Set((valueChanges || []).map(vc => vc.round));

    const statuses: TransferWindowStatus[] = [];

    // TW 0: Starting prices (always available, always "calculated")
    statuses.push({
      windowNumber: 0,
      correspondingWeekNumber: 0,
      hasRequiredStats: true, // No stats needed
      isCalculated: true, // Starting prices always exist
      canCalculate: false, // Can't calculate TW 0 (manually set)
      pricesCalculated: true, // TW 0 is always "calculated" (starting prices)
      transferWindowOpen: false, // TW 0 doesn't have a window concept
      weekId: undefined,
    });

    // TW N (N≥1)
    for (let i = 0; i < sortedWeeks.length; i++) {
      const week = sortedWeeks[i];
      const hasStats = statsResults[i];
      const isCalculated = calculatedRounds.has(week.week_number);

      statuses.push({
        windowNumber: week.week_number,
        correspondingWeekNumber: week.week_number,
        hasRequiredStats: hasStats,
        isCalculated,
        canCalculate: hasStats, // Can calculate if stats exist
        pricesCalculated: week.prices_calculated,
        transferWindowOpen: week.transfer_window_open,
        cutoffTime: week.transfer_cutoff_time,
        closedAt: week.transfer_window_closed_at,
        weekId: week.id,
        weekEndDate: week.end_date,
      });
    }

    return statuses;
  }

  /**
   * Calculate prices starting from a specific transfer window (cascade forward)
   * For TW N, calculates TW N, TW N+1, TW N+2, ... but ONLY for windows that have stats
   * Also marks each processed week as prices_calculated = true
   */
  async calculateFromWindow(
    seasonId: string,
    startingWindowNumber: number
  ): Promise<{ saved: number; windowsUpdated: number[] }> {
    if (startingWindowNumber < 1) {
      throw new Error('Cannot calculate TW 0 - starting prices are set manually');
    }

    // Get which windows have stats
    const windowStatuses = await this.getTransferWindowStatuses(seasonId);
    const windowsWithStats = new Set(
      windowStatuses
        .filter(s => s.windowNumber >= startingWindowNumber && s.hasRequiredStats)
        .map(s => s.windowNumber)
    );

    if (windowsWithStats.size === 0) {
      return { saved: 0, windowsUpdated: [] };
    }

    const priceTable = await this.calculatePriceTable(seasonId);
    let savedCount = 0;
    const windowsUpdated: number[] = [];

    for (const playerRow of priceTable.players) {
      for (const [windowNumber, data] of playerRow.transferWindowData) {
        // Only process windows >= starting window AND that have stats
        if (windowNumber >= startingWindowNumber && windowsWithStats.has(windowNumber)) {
          try {
            // Check if value change already exists
            const existing = await this.uow.valueChanges.findByPlayerAndRound(
              playerRow.playerId,
              windowNumber
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
                round: windowNumber,
                value: data.price,
              });
            }
            savedCount++;

            if (!windowsUpdated.includes(windowNumber)) {
              windowsUpdated.push(windowNumber);
            }
          } catch (error) {
            console.error(`Failed to save price for player ${playerRow.playerId} TW ${windowNumber}:`, error);
          }
        }
      }
    }

    // Mark all updated weeks as prices_calculated = true
    const weeks = await this.uow.weeks.findBySeason(seasonId);
    for (const windowNumber of windowsUpdated) {
      const week = weeks.find(w => w.week_number === windowNumber && !w.is_draft_week);
      if (week && !week.prices_calculated) {
        await this.uow.weeks.update({ id: week.id, prices_calculated: true });
      }
    }

    return { saved: savedCount, windowsUpdated: windowsUpdated.sort((a, b) => a - b) };
  }

  /**
   * Save calculated prices to value_changes table
   */
  async saveCalculatedPrices(seasonId: string): Promise<{ saved: number }> {
    const priceTable = await this.calculatePriceTable(seasonId);
    let savedCount = 0;

    for (const playerRow of priceTable.players) {
      for (const [windowNumber, data] of playerRow.transferWindowData) {
        // Only save TW 1+ prices (TW 0 uses starting price from season_players)
        if (windowNumber >= 1) {
          try {
            // Check if value change already exists
            const existing = await this.uow.valueChanges.findByPlayerAndRound(
              playerRow.playerId,
              windowNumber
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
                round: windowNumber,
                value: data.price,
              });
            }
            savedCount++;
          } catch (error) {
            console.error(`Failed to save price for player ${playerRow.playerId} TW ${windowNumber}:`, error);
          }
        }
      }
    }

    return { saved: savedCount };
  }

  /**
   * Preview the impact of a stats update without actually saving
   * Used for the confirmation modal when re-entering stats
   */
  async previewStatsUpdate(
    seasonId: string,
    weekNumber: number
  ): Promise<StatsUpdatePreview> {
    // Get all weeks for this season
    const weeks = await this.uow.weeks.findBySeason(seasonId);
    const sortedWeeks = weeks
      .filter(w => !w.is_draft_week && w.week_number >= weekNumber)
      .sort((a, b) => a.week_number - b.week_number);

    // Find affected windows (this week and all subsequent weeks with prices_calculated)
    const affectedWindows: StatsUpdatePreview['affectedWindows'] = [];
    let hasOpenWindow = false;

    for (const week of sortedWeeks) {
      if (week.prices_calculated || week.transfer_window_open) {
        const state = getTransferWindowState(
          week.prices_calculated,
          week.transfer_window_open,
          week.transfer_cutoff_time,
          week.transfer_window_closed_at,
          week.end_date
        );
        affectedWindows.push({
          weekNumber: week.week_number,
          state: state as 'upcoming' | 'ready' | 'open' | 'completed',
        });
        if (state === 'open') {
          hasOpenWindow = true;
        }
      }
    }

    // Get current prices for comparison
    const client = this.uow.getClient();
    const currentPrices = new Map<string, number>();

    // Get current value_changes for the affected windows
    const { data: existingChanges } = await client
      .from('value_changes')
      .select('player_id, round, value')
      .in('round', affectedWindows.map(w => w.weekNumber));

    if (existingChanges) {
      for (const change of existingChanges) {
        // Store the most recent price for each player
        const key = change.player_id;
        if (!currentPrices.has(key) || change.round >= weekNumber) {
          currentPrices.set(key, change.value);
        }
      }
    }

    // Calculate what the new prices would be
    const priceTable = await this.calculatePriceTable(seasonId);
    const priceChanges: PriceChange[] = [];

    for (const playerRow of priceTable.players) {
      const currentPrice = currentPrices.get(playerRow.playerId);
      if (currentPrice === undefined) continue;

      // Get the new price for the first affected window
      const newPriceData = playerRow.transferWindowData.get(weekNumber);
      if (!newPriceData) continue;

      const newPrice = newPriceData.price;
      const change = Math.round((newPrice - currentPrice) * 100) / 100;

      // Only include if there's a meaningful change
      if (Math.abs(change) >= 0.01) {
        priceChanges.push({
          playerId: playerRow.playerId,
          playerName: playerRow.playerName,
          teamName: playerRow.teamName,
          currentPrice,
          newPrice,
          change,
        });
      }
    }

    // Sort by absolute change descending
    priceChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return {
      affectedWindows,
      priceChanges: priceChanges.slice(0, 20), // Limit to top 20 for UI
      hasOpenWindow,
    };
  }
}
