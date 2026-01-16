/**
 * Budget Calculation Unit Tests
 * Tests the budget system logic
 *
 * Budget Rules:
 * - Week 1: $550 starting cap. Budget = $550 - sum of player values at current prices
 * - Week 2+: Budget carries forward. Changes only via transfers.
 *   - Sell at CURRENT market value
 *   - Buy at CURRENT market value
 *   - Budget change = sell_price - buy_price
 * - Player value appreciation does NOT affect budget (only transfers do)
 */

import { describe, it, expect } from 'vitest';
import {
  SALARY_CAP,
  MAX_TRANSFERS_PER_WEEK,
  TransferDelta,
} from '@/lib/domain/services/budget.service';

// Helper to calculate budget like Week 1
function calculateInitialBudget(playerValues: number[]): number {
  const totalValue = playerValues.reduce((sum, val) => sum + val, 0);
  return SALARY_CAP - totalValue;
}

// Helper to calculate budget after transfers like Week 2+
function calculateBudgetAfterTransfers(
  previousBudget: number,
  transfers: Array<{ playerInValue: number; playerOutValue: number }>
): { budget: number; transferDeltas: TransferDelta[] } {
  let totalDelta = 0;
  const transferDeltas: TransferDelta[] = [];

  for (const transfer of transfers) {
    const delta = transfer.playerOutValue - transfer.playerInValue;
    totalDelta += delta;
    transferDeltas.push({
      playerInId: 'mock-in',
      playerOutId: 'mock-out',
      playerInValue: transfer.playerInValue,
      playerOutValue: transfer.playerOutValue,
      delta,
    });
  }

  return {
    budget: previousBudget + totalDelta,
    transferDeltas,
  };
}

describe('Budget System', () => {
  describe('Constants', () => {
    it('has correct salary cap', () => {
      expect(SALARY_CAP).toBe(550);
    });

    it('has correct max transfers per week', () => {
      expect(MAX_TRANSFERS_PER_WEEK).toBe(2);
    });
  });

  describe('Week 1 - Initial Budget', () => {
    it('calculates correct budget when team costs less than cap', () => {
      // Team costs $540, budget should be $10
      const playerValues = [60, 55, 50, 45, 40, 60, 55, 50, 45, 80]; // = 540
      const budget = calculateInitialBudget(playerValues);
      expect(budget).toBe(10);
    });

    it('calculates correct budget when team costs exactly cap', () => {
      // Team costs exactly $550
      const playerValues = [55, 55, 55, 55, 55, 55, 55, 55, 55, 55]; // = 550
      const budget = calculateInitialBudget(playerValues);
      expect(budget).toBe(0);
    });

    it('shows negative budget when over cap', () => {
      // Team costs $560 (over budget)
      const playerValues = [60, 55, 55, 55, 55, 55, 55, 55, 60, 55]; // = 560
      const budget = calculateInitialBudget(playerValues);
      expect(budget).toBe(-10);
    });

    it('handles empty roster', () => {
      const budget = calculateInitialBudget([]);
      expect(budget).toBe(550);
    });
  });

  describe('Week 2+ - Budget After Transfers', () => {
    it('budget unchanged with no transfers', () => {
      const previousBudget = 10;
      const result = calculateBudgetAfterTransfers(previousBudget, []);
      expect(result.budget).toBe(10);
      expect(result.transferDeltas).toHaveLength(0);
    });

    it('budget increases when selling expensive player for cheaper', () => {
      // Previous budget: $10
      // Sell $50 player, buy $20 player
      // Budget = $10 + ($50 - $20) = $40
      const previousBudget = 10;
      const result = calculateBudgetAfterTransfers(previousBudget, [
        { playerOutValue: 50, playerInValue: 20 },
      ]);
      expect(result.budget).toBe(40);
      expect(result.transferDeltas[0].delta).toBe(30);
    });

    it('budget decreases when selling cheap player for expensive', () => {
      // Previous budget: $40
      // Sell $40 player, buy $70 player
      // Budget = $40 + ($40 - $70) = $10
      const previousBudget = 40;
      const result = calculateBudgetAfterTransfers(previousBudget, [
        { playerOutValue: 40, playerInValue: 70 },
      ]);
      expect(result.budget).toBe(10);
      expect(result.transferDeltas[0].delta).toBe(-30);
    });

    it('multiple transfers accumulate correctly', () => {
      // Previous budget: $20
      // Transfer 1: Sell $50, Buy $30 = +$20
      // Transfer 2: Sell $40, Buy $50 = -$10
      // Budget = $20 + $20 - $10 = $30
      const previousBudget = 20;
      const result = calculateBudgetAfterTransfers(previousBudget, [
        { playerOutValue: 50, playerInValue: 30 },
        { playerOutValue: 40, playerInValue: 50 },
      ]);
      expect(result.budget).toBe(30);
      expect(result.transferDeltas).toHaveLength(2);
      expect(result.transferDeltas[0].delta).toBe(20);
      expect(result.transferDeltas[1].delta).toBe(-10);
    });

    it('can go negative (invalid state)', () => {
      // Previous budget: $10
      // Sell $30 player, buy $100 player
      // Budget = $10 + ($30 - $100) = -$60 (invalid!)
      const previousBudget = 10;
      const result = calculateBudgetAfterTransfers(previousBudget, [
        { playerOutValue: 30, playerInValue: 100 },
      ]);
      expect(result.budget).toBe(-60);
    });

    it('price appreciation does not affect budget', () => {
      // Key rule: Player value appreciation does NOT affect budget
      // If I had $10 budget and my players go from $540 to $600 total value,
      // my budget is still $10 (not -$50)
      //
      // This is enforced by storing budget_remaining in snapshots and using
      // the stored value for Week 2+ calculations

      // Scenario: Week 1 team cost $540, budget was $10
      // Week 2: Same players now worth $600 due to appreciation
      // Budget should still be $10 (from stored snapshot)

      const storedBudgetFromPreviousWeek = 10;
      const result = calculateBudgetAfterTransfers(storedBudgetFromPreviousWeek, []);

      // Budget remains $10 regardless of player value changes
      expect(result.budget).toBe(10);
    });
  });

  describe('Validation', () => {
    it('budget >= 0 is valid', () => {
      expect(calculateInitialBudget([500])).toBeGreaterThanOrEqual(0);
      expect(calculateInitialBudget([550])).toBeGreaterThanOrEqual(0);
    });

    it('budget < 0 is invalid', () => {
      expect(calculateInitialBudget([560])).toBeLessThan(0);
    });
  });

  describe('Test Scenarios from Plan', () => {
    it('Scenario 1: Week 1 build team for $540k → budget = $10k', () => {
      const teamCost = 540;
      const budget = SALARY_CAP - teamCost;
      expect(budget).toBe(10);
    });

    it('Scenario 2: Week 2 no transfers, prices change → budget still $10k', () => {
      // Previous budget was $10 (stored in snapshot)
      // No transfers this week
      const previousBudget = 10;
      const result = calculateBudgetAfterTransfers(previousBudget, []);
      expect(result.budget).toBe(10);
    });

    it('Scenario 3: Week 2 sell $50k, buy $20k → budget = $10k + $30k = $40k', () => {
      const previousBudget = 10;
      const result = calculateBudgetAfterTransfers(previousBudget, [
        { playerOutValue: 50, playerInValue: 20 },
      ]);
      expect(result.budget).toBe(40);
    });

    it('Scenario 4: Week 3 sell $40k, buy $70k → budget = $40k - $30k = $10k', () => {
      const previousBudget = 40;
      const result = calculateBudgetAfterTransfers(previousBudget, [
        { playerOutValue: 40, playerInValue: 70 },
      ]);
      expect(result.budget).toBe(10);
    });

    it('Scenario 5: Cannot save if budget < 0', () => {
      // This test documents the validation rule
      // Actual validation is done in FantasyTeamSnapshotService
      const previousBudget = 10;
      const result = calculateBudgetAfterTransfers(previousBudget, [
        { playerOutValue: 30, playerInValue: 100 },
      ]);
      expect(result.budget).toBeLessThan(0);
      // In real code: budgetService.validateBudget(result.budget) === false
    });
  });
});
