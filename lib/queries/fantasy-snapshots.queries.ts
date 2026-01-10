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
  return useQuery({
    queryKey: snapshotKeys.detail(snapshotId),
    queryFn: () => getSnapshotWithPlayers(snapshotId),
    enabled: !!snapshotId,
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      fantasyTeamId,
      weekId,
      players,
    }: {
      fantasyTeamId: string;
      weekId: string;
      players: Array<{
        playerId: string;
        position: FantasyPosition;
        isBenched: boolean;
        isCaptain: boolean;
      }>;
    }) => createSnapshot(fantasyTeamId, weekId, players),
    onSuccess: (data, variables) => {
      // Invalidate all snapshot-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: snapshotKeys.byTeam(variables.fantasyTeamId) });
      queryClient.invalidateQueries({ queryKey: snapshotKeys.byWeek(variables.fantasyTeamId, variables.weekId) });
      // Invalidate all detail queries for this team/week (to catch snapshotWithPlayers)
      queryClient.invalidateQueries({ queryKey: [...snapshotKeys.all, 'detail'] });
      // Also invalidate fantasy team queries since snapshot affects team value
      queryClient.invalidateQueries({ queryKey: ['fantasy-teams', 'detail', variables.fantasyTeamId] });
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

