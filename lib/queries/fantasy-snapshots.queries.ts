/**
 * TanStack Query hooks for Fantasy Snapshots
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSnapshotsForTeam,
  getSnapshotForWeek,
  getSnapshotWithPlayers,
  createSnapshot,
  createSnapshotFromCurrentTeam,
} from '@/lib/api/fantasy-snapshots.api';
import { FantasyTeamSnapshot, FantasyPosition } from '@/lib/domain/types';
import { SnapshotWithPlayers } from '@/lib/api/fantasy-snapshots.api';

export const snapshotKeys = {
  all: ['snapshots'] as const,
  lists: () => [...snapshotKeys.all, 'list'] as const,
  byTeam: (teamId: string) => [...snapshotKeys.lists(), 'team', teamId] as const,
  byWeek: (teamId: string, weekId: string) => [...snapshotKeys.all, 'team', teamId, 'week', weekId] as const,
  detail: (id: string) => [...snapshotKeys.all, 'detail', id] as const,
};

export function useSnapshotsForTeam(fantasyTeamId: string) {
  return useQuery({
    queryKey: snapshotKeys.byTeam(fantasyTeamId),
    queryFn: () => getSnapshotsForTeam(fantasyTeamId),
    enabled: !!fantasyTeamId,
  });
}

export function useSnapshotForWeek(fantasyTeamId: string, weekId: string) {
  return useQuery({
    queryKey: snapshotKeys.byWeek(fantasyTeamId, weekId),
    queryFn: () => getSnapshotForWeek(fantasyTeamId, weekId),
    enabled: !!fantasyTeamId && !!weekId,
  });
}

export function useSnapshotWithPlayers(snapshotId: string) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: snapshotKeys.detail(snapshotId),
    queryFn: () => getSnapshotWithPlayers(snapshotId),
    enabled: !!snapshotId,
    // Return undefined when snapshot doesn't exist (not an error state)
    retry: false,
    // Use placeholderData to immediately use cached data if available
    // This prevents loading state when query key changes but data is already cached
    placeholderData: (previousData) => {
      if (!snapshotId) return previousData;
      const cached = queryClient.getQueryData<SnapshotWithPlayers | null>(snapshotKeys.detail(snapshotId));
      return cached !== undefined ? cached : previousData;
    },
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      fantasyTeamId,
      weekId,
      players,
      allowPartial = false,
    }: {
      fantasyTeamId: string;
      weekId: string;
      players: Array<{
        playerId: string;
        position: FantasyPosition;
        isBenched: boolean;
        isCaptain: boolean;
      }>;
      allowPartial?: boolean;
    }) => createSnapshot(fantasyTeamId, weekId, players, allowPartial),
    onSuccess: (data, variables) => {
      // Cache snapshotWithPlayers FIRST, then snapshot, synchronously to prevent loading state
      // When snapshot ID changes, useSnapshotWithPlayers will already have data cached
      if (data?.snapshot?.id && data) {
        // Update queries with exact keys for precise cache updates
        queryClient.setQueryData(snapshotKeys.detail(data.snapshot.id), data);
        queryClient.setQueryData(snapshotKeys.byWeek(variables.fantasyTeamId, variables.weekId), data.snapshot);
      }
      
      // Only invalidate queries that need updates (not the ones we just cached)
      // Invalidate team snapshots list (minimal invalidation)
      queryClient.invalidateQueries({ queryKey: snapshotKeys.byTeam(variables.fantasyTeamId) });
      // Invalidate fantasy team queries since snapshot affects team value
      queryClient.invalidateQueries({ queryKey: ['fantasy-teams', 'detail', variables.fantasyTeamId] });
      // Invalidate transfers list to refresh transfers table
      queryClient.invalidateQueries({ queryKey: ['transfers', 'week', variables.weekId] });
      toast.success('Team updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create snapshot: ${error.message}`);
    },
  });
}

export function useCreateSnapshotFromCurrentTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fantasyTeamId, weekId }: { fantasyTeamId: string; weekId: string }) =>
      createSnapshotFromCurrentTeam(fantasyTeamId, weekId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.byTeam(variables.fantasyTeamId) });
      toast.success('Snapshot created from current team');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create snapshot: ${error.message}`);
    },
  });
}

