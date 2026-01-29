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
  getTransferWindowStatuses,
  calculateFromWindow,
  previewStatsUpdate,
  openTransferWindow,
  closeTransferWindow,
  hasOpenWindow,
} from '@/lib/api/price-calculation.api';

export const priceCalculationKeys = {
  all: ['price-calculation'] as const,
  table: (seasonId: string) => [...priceCalculationKeys.all, 'table', seasonId] as const,
  valueChangesCount: (round: number) => [...priceCalculationKeys.all, 'value-changes-count', round] as const,
  transferWindowStatuses: (seasonId: string) => [...priceCalculationKeys.all, 'tw-statuses', seasonId] as const,
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

/**
 * Hook to get transfer window statuses for a season
 */
export function useTransferWindowStatuses(seasonId: string | undefined) {
  return useQuery({
    queryKey: priceCalculationKeys.transferWindowStatuses(seasonId || ''),
    queryFn: () => getTransferWindowStatuses(seasonId!),
    enabled: !!seasonId,
  });
}

/**
 * Hook to calculate prices from a specific transfer window onwards
 */
export function useCalculateFromWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, startingWindowNumber }: { seasonId: string; startingWindowNumber: number }) =>
      calculateFromWindow(seasonId, startingWindowNumber),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: priceCalculationKeys.all });
        queryClient.invalidateQueries({ queryKey: ['players'] });
        queryClient.invalidateQueries({ queryKey: ['seasons', 'weeks'] });
        const windowsText = result.windowsUpdated.length > 0
          ? `TW ${result.windowsUpdated.join(', TW ')}`
          : 'no windows';
        toast.success(`Saved ${result.saved} prices for ${windowsText}`);
      } else {
        toast.error(`Failed to calculate prices: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate prices: ${error.message}`);
    },
  });
}

/**
 * Hook to preview stats update impact
 */
export function usePreviewStatsUpdate(seasonId: string | undefined, weekNumber: number | undefined) {
  return useQuery({
    queryKey: [...priceCalculationKeys.all, 'preview', seasonId, weekNumber],
    queryFn: () => previewStatsUpdate(seasonId!, weekNumber!),
    enabled: !!seasonId && weekNumber !== undefined && weekNumber >= 1,
  });
}

/**
 * Hook to open a transfer window
 */
export function useOpenTransferWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekId: string) => openTransferWindow(weekId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: priceCalculationKeys.all });
        queryClient.invalidateQueries({ queryKey: ['seasons', 'weeks'] });
        toast.success('Transfer window opened');
      } else {
        toast.error(`Cannot open window: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to open window: ${error.message}`);
    },
  });
}

/**
 * Hook to close a transfer window
 */
export function useCloseTransferWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekId: string) => closeTransferWindow(weekId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: priceCalculationKeys.all });
        queryClient.invalidateQueries({ queryKey: ['seasons', 'weeks'] });
        toast.success('Transfer window closed');
      } else {
        toast.error(`Cannot close window: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to close window: ${error.message}`);
    },
  });
}

/**
 * Hook to check if any transfer window is open
 */
export function useHasOpenWindow(seasonId: string | undefined) {
  return useQuery({
    queryKey: [...priceCalculationKeys.all, 'has-open', seasonId],
    queryFn: () => hasOpenWindow(seasonId!),
    enabled: !!seasonId,
  });
}
