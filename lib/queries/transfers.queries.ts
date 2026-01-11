/**
 * TanStack Query hooks for Transfers
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  canMakeTransfer,
  getRemainingTransfers,
  executeTransfer,
  validateTransfer,
  getTransfersByWeek,
  getTransfersBySeason,
  isFirstWeek,
} from '@/lib/api/transfers.api';

// DEPRECATED: No longer used - first week now has 0 transfers (free roster selection)
// Keeping for backward compatibility if needed
export const UNLIMITED_TRANSFERS = -1;

export const transferKeys = {
  all: ['transfers'] as const,
  canTransfer: (teamId: string, weekId: string) => [...transferKeys.all, 'can', teamId, weekId] as const,
  remaining: (teamId: string, weekId: string) => [...transferKeys.all, 'remaining', teamId, weekId] as const,
  isFirstWeek: (teamId: string, weekId: string) => [...transferKeys.all, 'firstWeek', teamId, weekId] as const,
};

export function useCanMakeTransfer(fantasyTeamId: string, weekId: string) {
  return useQuery({
    queryKey: transferKeys.canTransfer(fantasyTeamId, weekId),
    queryFn: () => canMakeTransfer(fantasyTeamId, weekId),
    enabled: !!fantasyTeamId && !!weekId,
  });
}

export function useRemainingTransfers(fantasyTeamId: string, weekId: string) {
  return useQuery({
    queryKey: transferKeys.remaining(fantasyTeamId, weekId),
    queryFn: () => getRemainingTransfers(fantasyTeamId, weekId),
    enabled: !!fantasyTeamId && !!weekId,
  });
}

export function useIsFirstWeek(fantasyTeamId: string, weekId: string) {
  return useQuery({
    queryKey: transferKeys.isFirstWeek(fantasyTeamId, weekId),
    queryFn: () => isFirstWeek(fantasyTeamId, weekId),
    enabled: !!fantasyTeamId && !!weekId,
  });
}

export function useExecuteTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      fantasyTeamId,
      playerInId,
      playerOutId,
      weekId,
    }: {
      fantasyTeamId: string;
      playerInId: string;
      playerOutId: string;
      weekId: string;
    }) => executeTransfer(fantasyTeamId, playerInId, playerOutId, weekId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      toast.success('Transfer executed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });
}

export function useValidateTransfer() {
  return useMutation({
    mutationFn: ({
      fantasyTeamId,
      playerInId,
      playerOutId,
      weekId,
    }: {
      fantasyTeamId: string;
      playerInId: string;
      playerOutId: string;
      weekId: string;
    }) => validateTransfer(fantasyTeamId, playerInId, playerOutId, weekId),
  });
}

export function useTransfersByWeek(weekId: string) {
  return useQuery({
    queryKey: [...transferKeys.all, 'week', weekId],
    queryFn: () => getTransfersByWeek(weekId),
    enabled: !!weekId,
  });
}

export function useTransfersBySeason(seasonId: string) {
  return useQuery({
    queryKey: [...transferKeys.all, 'season', seasonId],
    queryFn: () => getTransfersBySeason(seasonId),
    enabled: !!seasonId,
  });
}

