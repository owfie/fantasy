/**
 * Price Calculation API - Server Actions
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { PriceCalculationService, PriceTableData, StatsUpdatePreview } from '@/lib/domain/services/price-calculation.service';
import { TransferService } from '@/lib/domain/services/transfer.service';
import { TransferWindowStatus } from '@/lib/domain/types';

/**
 * Get full player prices table for a season
 */
export async function getPlayerPricesTable(seasonId: string): Promise<PriceTableData> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new PriceCalculationService(uow);
    return service.calculatePriceTable(seasonId);
  });
}

/**
 * Recalculate and save all player prices for a season
 */
export async function recalculateAndSavePrices(seasonId: string): Promise<{ success: boolean; saved: number; error?: string }> {
  const uow = await getUnitOfWork();
  try {
    const service = new PriceCalculationService(uow);
    const result = await service.saveCalculatedPrices(seasonId);
    return { success: true, saved: result.saved };
  } catch (error) {
    return {
      success: false,
      saved: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get count of value_changes for a specific round (for diagnostics)
 */
export async function getValueChangesCountForRound(round: number): Promise<number> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const changes = await uow.valueChanges.findByRound(round);
    return changes.length;
  });
}

/**
 * Get status of all transfer windows for a season
 */
export async function getTransferWindowStatuses(seasonId: string): Promise<TransferWindowStatus[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new PriceCalculationService(uow);
    return service.getTransferWindowStatuses(seasonId);
  });
}

/**
 * Calculate prices from a specific transfer window onwards (cascade forward)
 */
export async function calculateFromWindow(
  seasonId: string,
  startingWindowNumber: number
): Promise<{ success: boolean; saved: number; windowsUpdated: number[]; error?: string }> {
  const uow = await getUnitOfWork();
  try {
    const service = new PriceCalculationService(uow);
    const result = await service.calculateFromWindow(seasonId, startingWindowNumber);
    return { success: true, saved: result.saved, windowsUpdated: result.windowsUpdated };
  } catch (error) {
    return {
      success: false,
      saved: 0,
      windowsUpdated: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Preview the impact of updating stats (for confirmation modal)
 */
export async function previewStatsUpdate(
  seasonId: string,
  weekNumber: number
): Promise<StatsUpdatePreview> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new PriceCalculationService(uow);
    return service.previewStatsUpdate(seasonId, weekNumber);
  });
}

/**
 * Open a transfer window for a week
 * Validates that prices are calculated and no other window is open
 */
export async function openTransferWindow(
  weekId: string
): Promise<{ success: boolean; error?: string }> {
  const uow = await getUnitOfWork();
  try {
    const service = new TransferService(uow);
    return await service.openTransferWindow(weekId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Close a transfer window for a week
 */
export async function closeTransferWindow(
  weekId: string
): Promise<{ success: boolean; error?: string }> {
  const uow = await getUnitOfWork();
  try {
    const service = new TransferService(uow);
    return await service.closeTransferWindow(weekId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if any transfer window is open for a season
 */
export async function hasOpenWindow(
  seasonId: string
): Promise<{ hasOpen: boolean; openWeek?: { id: string; weekNumber: number } }> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new TransferService(uow);
    return service.hasOpenWindow(seasonId);
  });
}
