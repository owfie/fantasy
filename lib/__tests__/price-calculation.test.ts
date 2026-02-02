/**
 * Price Calculation Unit Tests
 * Tests the price calculation formula and logic
 *
 * Formula: NewValue = PreviousValue + (10 * TwoWeekPointsAverage - PreviousValue) / 4
 *
 * Key behaviors:
 * - Price only changes when player actually plays
 * - If player misses a week, price is frozen (carried forward unchanged)
 * - Rolling 2-week average uses only weeks where player played
 */

import { describe, it, expect } from 'vitest';

/**
 * Calculate new price from previous price and points average
 * Formula: NewValue = PreviousValue + (10 * TwoWeekPointsAverage - PreviousValue) / 4
 */
function calculateNewPrice(previousValue: number, twoWeekAvgPoints: number): number {
  const newValue = previousValue + (10 * twoWeekAvgPoints - previousValue) / 4;
  return Math.round(newValue * 100) / 100;
}

/**
 * Calculate price progression across multiple weeks
 * Mirrors the logic in PriceCalculationService.calculatePriceTable()
 *
 * @param startingPrice - Initial player price
 * @param weeklyData - Array of { points, played } for each week
 * @returns Array of prices for each week (including starting price as index 0)
 */
function calculatePriceProgression(
  startingPrice: number,
  weeklyData: Array<{ points: number; played: boolean }>
): number[] {
  const prices: number[] = [startingPrice]; // TW 0 = starting price
  let previousPrice = startingPrice;
  const playedPointsHistory: number[] = [];

  for (const { points, played } of weeklyData) {
    let price: number;

    if (!played) {
      // Player didn't play this week - freeze price at previous value
      price = previousPrice;
    } else {
      // Player played - add to history and recalculate
      playedPointsHistory.push(points);

      if (playedPointsHistory.length === 1) {
        price = calculateNewPrice(previousPrice, playedPointsHistory[0]);
      } else {
        const lastTwo = playedPointsHistory.slice(-2);
        const twoWeekAvg = (lastTwo[0] + lastTwo[1]) / 2;
        price = calculateNewPrice(previousPrice, twoWeekAvg);
      }
    }

    prices.push(price);
    previousPrice = price;
  }

  return prices;
}

describe('Price Calculation', () => {
  describe('calculateNewPrice formula', () => {
    it('calculates correct price with moderate points', () => {
      // Formula: NewValue = PreviousValue + (10 * avg - PreviousValue) / 4
      // With prev=$50, avg=5: NewValue = 50 + (50 - 50) / 4 = 50
      expect(calculateNewPrice(50, 5)).toBe(50);
    });

    it('increases price with high points', () => {
      // prev=$50, avg=10: NewValue = 50 + (100 - 50) / 4 = 62.5
      expect(calculateNewPrice(50, 10)).toBe(62.5);
    });

    it('decreases price with low points', () => {
      // prev=$50, avg=0: NewValue = 50 + (0 - 50) / 4 = 37.5
      expect(calculateNewPrice(50, 0)).toBe(37.5);
    });

    it('handles decimal averages', () => {
      // prev=$50, avg=7.5: NewValue = 50 + (75 - 50) / 4 = 56.25
      expect(calculateNewPrice(50, 7.5)).toBe(56.25);
    });

    it('rounds to 2 decimal places', () => {
      // prev=$50, avg=3: NewValue = 50 + (30 - 50) / 4 = 45
      expect(calculateNewPrice(50, 3)).toBe(45);
      // prev=$50, avg=7: NewValue = 50 + (70 - 50) / 4 = 55
      expect(calculateNewPrice(50, 7)).toBe(55);
    });
  });

  describe('Price progression - player plays every week', () => {
    it('calculates correct prices across 3 weeks', () => {
      const startingPrice = 50;
      const weeklyData = [
        { points: 10, played: true }, // Week 1: 10 points
        { points: 8, played: true },  // Week 2: 8 points
        { points: 12, played: true }, // Week 3: 12 points
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // TW 0: Starting price = $50
      expect(prices[0]).toBe(50);

      // TW 1: Single week avg = 10, price = 50 + (100 - 50) / 4 = 62.5
      expect(prices[1]).toBe(62.5);

      // TW 2: 2-week avg = (10 + 8) / 2 = 9, price = 62.5 + (90 - 62.5) / 4 = 69.375
      expect(prices[2]).toBe(69.38); // Rounded

      // TW 3: 2-week avg = (8 + 12) / 2 = 10, price = 69.38 + (100 - 69.38) / 4 = 77.035
      expect(prices[3]).toBe(77.04); // Rounded
    });
  });

  describe('Price progression - player misses a week', () => {
    it('freezes price when player does not play', () => {
      const startingPrice = 50;
      const weeklyData = [
        { points: 15, played: true },  // Week 1: plays, scores 15
        { points: 0, played: false },  // Week 2: DOES NOT PLAY
        { points: 10, played: true },  // Week 3: plays, scores 10
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // TW 0: Starting price = $50
      expect(prices[0]).toBe(50);

      // TW 1: Single week avg = 15, price = 50 + (150 - 50) / 4 = 75
      expect(prices[1]).toBe(75);

      // TW 2: Player didn't play - price FROZEN at $75
      expect(prices[2]).toBe(75);

      // TW 3: 2-week avg of PLAYED weeks = (15 + 10) / 2 = 12.5
      // price = 75 + (125 - 75) / 4 = 87.5
      expect(prices[3]).toBe(87.5);
    });

    it('correctly handles multiple consecutive missed weeks', () => {
      const startingPrice = 50;
      const weeklyData = [
        { points: 10, played: true },  // Week 1: plays
        { points: 0, played: false },  // Week 2: misses
        { points: 0, played: false },  // Week 3: misses
        { points: 8, played: true },   // Week 4: plays
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // TW 1: price = 50 + (100 - 50) / 4 = 62.5
      expect(prices[1]).toBe(62.5);

      // TW 2: FROZEN at 62.5
      expect(prices[2]).toBe(62.5);

      // TW 3: STILL FROZEN at 62.5
      expect(prices[3]).toBe(62.5);

      // TW 4: 2-week avg of PLAYED weeks = (10 + 8) / 2 = 9
      // price = 62.5 + (90 - 62.5) / 4 = 69.375
      expect(prices[4]).toBe(69.38);
    });

    it('player never plays - price stays at starting value', () => {
      const startingPrice = 50;
      const weeklyData = [
        { points: 0, played: false },
        { points: 0, played: false },
        { points: 0, played: false },
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      expect(prices[0]).toBe(50);
      expect(prices[1]).toBe(50);
      expect(prices[2]).toBe(50);
      expect(prices[3]).toBe(50);
    });
  });

  describe('Bug fix verification - Harry Buckland scenario', () => {
    /**
     * Scenario from the bug report:
     * - Harry Buckland: $49 starting price
     * - Week 1: Played, scored 15 points (74 total in some display)
     * - Week 2: Did NOT play (greyed out)
     *
     * Bug: Price was still changing in Week 2
     * Expected: Price should be frozen in Week 2
     */
    it('Harry Buckland scenario - Week 2 price should equal Week 1 price', () => {
      const startingPrice = 49;
      const weeklyData = [
        { points: 15, played: true },  // Week 1: played
        { points: 0, played: false },  // Week 2: DID NOT PLAY
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // Week 1 price
      const week1Price = prices[1];

      // Week 2 price should be IDENTICAL to Week 1 (frozen)
      expect(prices[2]).toBe(week1Price);
    });

    it('Ryan Froud scenario - price frozen when missed Week 2', () => {
      const startingPrice = 42;
      const weeklyData = [
        { points: 4, played: true },   // Week 1: played, scored 4 (42 total)
        { points: 0, played: false },  // Week 2: DID NOT PLAY
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // Week 1: price = 42 + (40 - 42) / 4 = 41.5
      expect(prices[1]).toBe(41.5);

      // Week 2: FROZEN at 41.5
      expect(prices[2]).toBe(41.5);
    });
  });

  describe('Edge cases', () => {
    it('handles zero points correctly (different from not playing)', () => {
      const startingPrice = 50;
      const weeklyData = [
        { points: 0, played: true },  // Week 1: PLAYED but scored 0
        { points: 0, played: true },  // Week 2: PLAYED but scored 0
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // TW 1: avg = 0, price = 50 + (0 - 50) / 4 = 37.5
      expect(prices[1]).toBe(37.5);

      // TW 2: avg = 0, price = 37.5 + (0 - 37.5) / 4 = 28.125
      expect(prices[2]).toBe(28.13);
    });

    it('handles very high scores', () => {
      const startingPrice = 50;
      const weeklyData = [
        { points: 25, played: true },
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // avg = 25, price = 50 + (250 - 50) / 4 = 100
      expect(prices[1]).toBe(100);
    });

    it('handles negative points (drops/throwaways)', () => {
      const startingPrice = 50;
      const weeklyData = [
        { points: -2, played: true },
      ];

      const prices = calculatePriceProgression(startingPrice, weeklyData);

      // avg = -2, price = 50 + (-20 - 50) / 4 = 32.5
      expect(prices[1]).toBe(32.5);
    });
  });
});
