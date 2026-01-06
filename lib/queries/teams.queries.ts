/**
 * TanStack Query hooks for Teams
 * Provides data fetching, caching, and mutation management for teams
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createTeam, updateTeam, deleteTeam, getTeams, getTeam, testGetAllTeams, testRestoreTeam } from '@/lib/api';
import { Team, InsertTeam, UpdateTeam } from '@/lib/domain/types';
import { testKeys } from './test.queries';

export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters?: string) => [...teamKeys.lists(), { filters }] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
  allIncludingDeleted: () => [...teamKeys.all, 'allIncludingDeleted'] as const,
};

/**
 * Query hook to fetch all teams
 */
export function useTeams() {
  return useQuery({
    queryKey: teamKeys.lists(),
    queryFn: () => getTeams(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query hook to fetch all teams including soft-deleted (for admin/test views)
 */
export function useTeamsIncludingDeleted() {
  return useQuery({
    queryKey: teamKeys.allIncludingDeleted(),
    queryFn: async () => {
      const result = await testGetAllTeams();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Query hook to fetch a single team by ID
 */
export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => getTeam(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook to create a new team
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertTeam) => createTeam(data),
    onMutate: async (newTeam) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: teamKeys.lists() });
      await queryClient.cancelQueries({ queryKey: teamKeys.allIncludingDeleted() });

      // Snapshot the previous value
      const previousTeams = queryClient.getQueryData<Team[]>(teamKeys.lists());
      const previousAllTeams = queryClient.getQueryData<Team[]>(teamKeys.allIncludingDeleted());

      // Optimistically update the cache
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (old = []) => [
        ...old,
        { ...newTeam, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Team,
      ]);
      queryClient.setQueryData<Team[]>(teamKeys.allIncludingDeleted(), (old = []) => [
        ...old,
        { ...newTeam, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Team,
      ]);

      // Return context with previous values for rollback
      return { previousTeams, previousAllTeams };
    },
    onError: (err, newTeam, context) => {
      // Rollback on error
      if (context?.previousTeams) {
        queryClient.setQueryData(teamKeys.lists(), context.previousTeams);
      }
      if (context?.previousAllTeams) {
        queryClient.setQueryData(teamKeys.allIncludingDeleted(), context.previousAllTeams);
      }
      toast.error('Failed to create team', { description: err.message });
    },
    onSuccess: (data) => {
      // Invalidate and refetch teams list
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      // Also set the new team in cache
      queryClient.setQueryData(teamKeys.detail(data.id), data);
      
      toast.success('Team created', { description: `Team "${data.name}" has been created` });
    },
  });
}

/**
 * Mutation hook to update a team
 */
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTeam) => updateTeam(data),
    onMutate: async (updatedTeam) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: teamKeys.detail(updatedTeam.id) });
      await queryClient.cancelQueries({ queryKey: teamKeys.lists() });
      await queryClient.cancelQueries({ queryKey: teamKeys.allIncludingDeleted() });

      // Snapshot previous values
      const previousTeam = queryClient.getQueryData<Team>(teamKeys.detail(updatedTeam.id));
      const previousTeams = queryClient.getQueryData<Team[]>(teamKeys.lists());
      const previousAllTeams = queryClient.getQueryData<Team[]>(teamKeys.allIncludingDeleted());

      // Optimistically update single team
      if (previousTeam) {
        queryClient.setQueryData<Team>(teamKeys.detail(updatedTeam.id), {
          ...previousTeam,
          ...updatedTeam,
        });
      }

      // Optimistically update teams list
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (old = []) =>
        old.map((team) => (team.id === updatedTeam.id ? { ...team, ...updatedTeam } : team))
      );
      queryClient.setQueryData<Team[]>(teamKeys.allIncludingDeleted(), (old = []) =>
        old.map((team) => (team.id === updatedTeam.id ? { ...team, ...updatedTeam } : team))
      );

      return { previousTeam, previousTeams, previousAllTeams };
    },
    onError: (err, updatedTeam, context) => {
      // Rollback on error
      if (context?.previousTeam) {
        queryClient.setQueryData(teamKeys.detail(updatedTeam.id), context.previousTeam);
      }
      if (context?.previousTeams) {
        queryClient.setQueryData(teamKeys.lists(), context.previousTeams);
      }
      if (context?.previousAllTeams) {
        queryClient.setQueryData(teamKeys.allIncludingDeleted(), context.previousAllTeams);
      }
      toast.error('Failed to update team', { description: err.message });
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      toast.success('Team updated', { description: `Team "${data.name}" has been updated` });
    },
  });
}

/**
 * Mutation hook to delete a team
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: teamKeys.lists() });
      await queryClient.cancelQueries({ queryKey: teamKeys.allIncludingDeleted() });
      await queryClient.cancelQueries({ queryKey: teamKeys.detail(id) });

      // Snapshot previous values
      const previousTeams = queryClient.getQueryData<Team[]>(teamKeys.lists());
      const previousAllTeams = queryClient.getQueryData<Team[]>(teamKeys.allIncludingDeleted());

      // Optimistically remove team from list (for regular list, it's removed)
      queryClient.setQueryData<Team[]>(teamKeys.lists(), (old = []) =>
        old.filter((team) => team.id !== id)
      );

      // For all teams including deleted, mark as deleted instead of removing
      queryClient.setQueryData<Team[]>(teamKeys.allIncludingDeleted(), (old = []) =>
        old.map((team) =>
          team.id === id ? { ...team, deleted_at: new Date().toISOString() } : team
        )
      );

      // Remove team detail from cache
      queryClient.removeQueries({ queryKey: teamKeys.detail(id) });

      return { previousTeams, previousAllTeams };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousTeams) {
        queryClient.setQueryData(teamKeys.lists(), context.previousTeams);
      }
      if (context?.previousAllTeams) {
        queryClient.setQueryData(teamKeys.allIncludingDeleted(), context.previousAllTeams);
      }
      toast.error('Failed to delete team', { description: err.message });
    },
    onSuccess: () => {
      // Invalidate teams list to ensure consistency
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      toast.success('Team deleted', { description: 'Team has been permanently deleted' });
    },
  });
}

/**
 * Mutation hook to restore a soft-deleted team
 */
export function useRestoreTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => testRestoreTeam(id),
    onSuccess: async (result) => {
      if (result.success) {
        // Invalidate queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
        queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
        // Invalidate test dashboard since it contains teams data
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        if (result.data) {
          queryClient.setQueryData(teamKeys.detail(result.data.id), result.data);
        }
        toast.success('Team restored', { description: result.message });
      } else {
        toast.error('Failed to restore team', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to restore team', { description: error.message });
    },
  });
}
