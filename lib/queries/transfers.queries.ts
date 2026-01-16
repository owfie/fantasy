/**
 * TanStack Query hooks for Transfers
 *
 * Note: Transfers are now computed from snapshot diffs, not stored in the transfers table.
 * The executeTransfer and validateTransfer hooks have been removed.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  canMakeTransfer,
  getRemainingTransfers,
  getTransfersByWeek,
  getTransfersBySeason,
  isFirstWeek,
} from '@/lib/api/transfers.api';

export const transferKeys = {
  all: ['transfers'] as const,
  canTransfer: (weekId: string) => [...transferKeys.all, 'can', weekId] as const,
  remaining: (teamId: string, weekId: string) => [...transferKeys.all, 'remaining', teamId, weekId] as const,
  isFirstWeek: (teamId: string, weekId: string) => [...transferKeys.all, 'firstWeek', teamId, weekId] as const,
};

/**
 * Check if the transfer window is open for a week
 */
export function useCanMakeTransfer(weekId: string) {
  return useQuery({
    queryKey: transferKeys.canTransfer(weekId),
    queryFn: () => canMakeTransfer(weekId),
    enabled: !!weekId,
  });
}

/**
 * Get remaining transfers for a fantasy team in a week
 * Returns Infinity for first week (unlimited transfers)
 */
export function useRemainingTransfers(fantasyTeamId: string, weekId: string) {
  return useQuery({
    queryKey: transferKeys.remaining(fantasyTeamId, weekId),
    queryFn: () => getRemainingTransfers(fantasyTeamId, weekId),
    enabled: !!fantasyTeamId && !!weekId,
  });
}

/**
 * Check if this is the team's first week
 */
export function useIsFirstWeek(fantasyTeamId: string, weekId: string) {
  return useQuery({
    queryKey: transferKeys.isFirstWeek(fantasyTeamId, weekId),
    queryFn: () => isFirstWeek(fantasyTeamId, weekId),
    enabled: !!fantasyTeamId && !!weekId,
  });
}

/**
 * Get all transfers for a week (from transfers table - audit purposes)
 * @deprecated Transfers are now computed from snapshot diffs
 */
export function useTransfersByWeek(weekId: string) {
  return useQuery({
    queryKey: [...transferKeys.all, 'week', weekId],
    queryFn: () => getTransfersByWeek(weekId),
    enabled: !!weekId,
  });
}

/**
 * Get all transfers for a season (from transfers table - audit purposes)
 * @deprecated Transfers are now computed from snapshot diffs
 */
export function useTransfersBySeason(seasonId: string) {
  return useQuery({
    queryKey: [...transferKeys.all, 'season', seasonId],
    queryFn: () => getTransfersBySeason(seasonId),
    enabled: !!seasonId,
  });
}
