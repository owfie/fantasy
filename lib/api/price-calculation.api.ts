/**
 * Price Calculation API - Server Actions
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { PriceCalculationService, PriceTableData } from '@/lib/domain/services/price-calculation.service';

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
