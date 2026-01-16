/**
 * TanStack Query hooks for Price Calculation
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPlayerPricesTable,
  recalculateAndSavePrices,
  getValueChangesCountForRound,
} from '@/lib/api/price-calculation.api';

export const priceCalculationKeys = {
  all: ['price-calculation'] as const,
  table: (seasonId: string) => [...priceCalculationKeys.all, 'table', seasonId] as const,
  valueChangesCount: (round: number) => [...priceCalculationKeys.all, 'value-changes-count', round] as const,
};

export function usePlayerPricesTable(seasonId: string | undefined) {
  return useQuery({
    queryKey: priceCalculationKeys.table(seasonId || ''),
    queryFn: () => getPlayerPricesTable(seasonId!),
    enabled: !!seasonId,
  });
}

export function useRecalculatePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seasonId: string) => recalculateAndSavePrices(seasonId),
    onSuccess: (result, seasonId) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: priceCalculationKeys.all });
        queryClient.invalidateQueries({ queryKey: ['players'] });
        toast.success(`Saved ${result.saved} price updates`);
      } else {
        toast.error(`Failed to save prices: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to recalculate prices: ${error.message}`);
    },
  });
}

/**
 * Hook to get count of value_changes for a specific round (for diagnostics)
 */
export function useValueChangesCount(round: number | undefined) {
  return useQuery({
    queryKey: priceCalculationKeys.valueChangesCount(round || 0),
    queryFn: () => getValueChangesCountForRound(round!),
    enabled: !!round && round >= 2, // Only relevant for week 2+
  });
}
