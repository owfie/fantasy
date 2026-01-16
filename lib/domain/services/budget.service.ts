/**
 * Budget Service
 * Handles budget calculations for fantasy teams
 *
 * Budget Rules:
 * - Week 1: $550 starting cap. Budget = $550 - sum of player values at current prices
 * - Week 2+: Budget carries forward. Changes only via transfers.
 *   - Sell at CURRENT market value
 *   - Buy at CURRENT market value
 *   - Budget change = sell_price - buy_price
 * - Player value appreciation does NOT affect budget (only transfers do)
 */

import { UnitOfWork } from '../unit-of-work';
import { ValueTrackingService } from './value-tracking.service';

export const SALARY_CAP = 550;
export const MAX_TRANSFERS_PER_WEEK = 2;

export interface TransferDelta {
  playerInId: string;
  playerOutId: string;
  playerInValue: number;
  playerOutValue: number;
  delta: number; // outValue - inValue (positive = budget increase)
}

export interface BudgetCalculationResult {
  budget: number;
  teamValue: number;
  transferDeltas: TransferDelta[];
  isValid: boolean;
  error?: string;
}

export class BudgetService {
  private valueTracking: ValueTrackingService;

  constructor(private uow: UnitOfWork) {
    this.valueTracking = new ValueTrackingService(uow);
  }

  /**
   * Calculate initial budget for week 1
   * Budget = SALARY_CAP - sum of current player values
   */
  async calculateInitialBudget(
    playerIds: string[],
    weekNumber: number,
    seasonId: string
  ): Promise<BudgetCalculationResult> {
    const playerValues = await this.valueTracking.getPlayerValuesForWeek(
      playerIds,
      weekNumber,
      seasonId
    );

    const teamValue = Array.from(playerValues.values()).reduce((sum, val) => sum + val, 0);
    const budget = SALARY_CAP - teamValue;

    return {
      budget,
      teamValue,
      transferDeltas: [],
      isValid: budget >= 0,
      error: budget < 0 ? `Budget exceeded by $${Math.abs(budget).toFixed(0)}` : undefined,
    };
  }

  /**
   * Calculate budget after transfers for week 2+
   * Budget = previous_budget + sum of (sell_value - buy_value) for each transfer
   *
   * @param previousBudget - Budget from the previous week's snapshot
   * @param transfers - Array of { playerInId, playerOutId } pairs
   * @param weekNumber - Current week number (for value lookups)
   * @param seasonId - Season ID (for value lookups)
   */
  async calculateBudgetAfterTransfers(
    previousBudget: number,
    transfers: Array<{ playerInId: string; playerOutId: string }>,
    weekNumber: number,
    seasonId: string
  ): Promise<BudgetCalculationResult> {
    const transferDeltas: TransferDelta[] = [];
    let totalDelta = 0;

    // Get all player IDs involved in transfers
    const allPlayerIds = [
      ...transfers.map(t => t.playerInId),
      ...transfers.map(t => t.playerOutId),
    ].filter(id => id); // Filter out empty IDs

    // Get current values for all players
    const playerValues = await this.valueTracking.getPlayerValuesForWeek(
      allPlayerIds,
      weekNumber,
      seasonId
    );

    // Calculate delta for each transfer
    for (const transfer of transfers) {
      const playerInValue = playerValues.get(transfer.playerInId) || 0;
      const playerOutValue = playerValues.get(transfer.playerOutId) || 0;
      const delta = playerOutValue - playerInValue; // Positive = budget increase

      transferDeltas.push({
        playerInId: transfer.playerInId,
        playerOutId: transfer.playerOutId,
        playerInValue,
        playerOutValue,
        delta,
      });

      totalDelta += delta;
    }

    const budget = previousBudget + totalDelta;

    return {
      budget,
      teamValue: 0, // Not calculated here - use separate method if needed
      transferDeltas,
      isValid: budget >= 0,
      error: budget < 0 ? `Budget exceeded by $${Math.abs(budget).toFixed(0)}` : undefined,
    };
  }

  /**
   * Calculate team value (sum of current market values of all players)
   * This is separate from budget - team value changes with market, budget doesn't
   */
  async calculateTeamValue(
    playerIds: string[],
    weekNumber: number,
    seasonId: string
  ): Promise<number> {
    const playerValues = await this.valueTracking.getPlayerValuesForWeek(
      playerIds,
      weekNumber,
      seasonId
    );
    return Array.from(playerValues.values()).reduce((sum, val) => sum + val, 0);
  }

  /**
   * Validate budget is non-negative
   */
  validateBudget(budget: number): boolean {
    return budget >= 0;
  }

  /**
   * Validate transfer count against limit
   * Week 1 has unlimited transfers, Week 2+ limited to MAX_TRANSFERS_PER_WEEK
   */
  validateTransferCount(transferCount: number, isFirstWeek: boolean): boolean {
    if (isFirstWeek) return true;
    return transferCount <= MAX_TRANSFERS_PER_WEEK;
  }
}
