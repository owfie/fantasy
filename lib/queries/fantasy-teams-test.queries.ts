/**
 * TanStack Query hooks for Fantasy Teams Test Operations
 * Wraps test actions that return { success, message, data } format
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  testGetUserProfiles,
  testSetUserAdmin,
  testGetActiveSeason,
  testGetAllFantasyTeams,
  testGetFantasyTeamWithPlayers,
  testCreateFantasyTeamEmpty,
  testUpdateFantasyTeam,
  testDeleteFantasyTeam,
  testAddPlayerToFantasyTeam,
  testRemovePlayerFromFantasyTeam,
  testSetFantasyTeamCaptain,
  testSetPlayerBenchStatus,
  testGetAvailablePlayers,
} from '@/lib/api';
import { testKeys } from './test.queries';

interface TestActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Query keys for fantasy teams
export const fantasyTeamKeys = {
  all: ['fantasyTeams'] as const,
  lists: () => [...fantasyTeamKeys.all, 'list'] as const,
  list: (filters: string) => [...fantasyTeamKeys.lists(), { filters }] as const,
  details: () => [...fantasyTeamKeys.all, 'detail'] as const,
  detail: (id: string) => [...fantasyTeamKeys.details(), id] as const,
  availablePlayers: (seasonId: string) => [...fantasyTeamKeys.all, 'availablePlayers', seasonId] as const,
  users: () => ['users'] as const,
  activeSeason: () => ['activeSeason'] as const,
};

/**
 * Hook to fetch all user profiles
 */
export function useUserProfiles() {
  return useQuery({
    queryKey: fantasyTeamKeys.users(),
    queryFn: async () => {
      const result = await testGetUserProfiles();
      if (!result.success) {
        throw new Error(result.error || result.message);
      }
      return result.data || [];
    },
  });
}

/**
 * Mutation hook for setting user admin status
 */
export function useSetUserAdmin() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { userId: string; isAdmin: boolean }>({
    mutationFn: ({ userId, isAdmin }) => testSetUserAdmin(userId, isAdmin),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.users() });
      
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error('Failed to update user', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update user', { description: error.message });
    },
  });
}

/**
 * Hook to fetch active season
 */
export function useActiveSeason() {
  return useQuery({
    queryKey: fantasyTeamKeys.activeSeason(),
    queryFn: async () => {
      const result = await testGetActiveSeason();
      // Don't throw on no active season - just return null
      return result.data || null;
    },
  });
}

/**
 * Hook to fetch fantasy teams for a specific season
 */
export function useFantasyTeams(seasonId: string | null) {
  return useQuery({
    queryKey: fantasyTeamKeys.list(seasonId || ''),
    queryFn: async () => {
      if (!seasonId) return [];
      const result = await testGetAllFantasyTeams(seasonId);
      if (!result.success) {
        throw new Error(result.error || result.message);
      }
      return result.data || [];
    },
    enabled: !!seasonId,
  });
}

/**
 * Hook to fetch a fantasy team with its players
 */
export function useFantasyTeamWithPlayers(fantasyTeamId: string | null) {
  return useQuery({
    queryKey: fantasyTeamKeys.detail(fantasyTeamId || ''),
    queryFn: async () => {
      if (!fantasyTeamId) return null;
      const result = await testGetFantasyTeamWithPlayers(fantasyTeamId);
      if (!result.success) {
        throw new Error(result.error || result.message);
      }
      return result.data;
    },
    enabled: !!fantasyTeamId,
  });
}

/**
 * Hook to fetch available players for a season
 */
export function useAvailablePlayers(seasonId: string | null) {
  return useQuery({
    queryKey: fantasyTeamKeys.availablePlayers(seasonId || ''),
    queryFn: async () => {
      if (!seasonId) return [];
      const result = await testGetAvailablePlayers(seasonId);
      if (!result.success) {
        throw new Error(result.error || result.message);
      }
      return result.data || [];
    },
    enabled: !!seasonId,
  });
}

/**
 * Mutation hook for creating a fantasy team
 */
export function useCreateFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { ownerId: string; seasonId: string; name: string }>({
    mutationFn: ({ ownerId, seasonId, name }) => testCreateFantasyTeamEmpty(ownerId, seasonId, name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      if (data.success) {
        toast.success('Fantasy team created', { description: data.message });
      } else {
        toast.error('Failed to create fantasy team', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to create fantasy team', { description: error.message });
    },
  });
}

/**
 * Mutation hook for updating a fantasy team
 */
export function useUpdateFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { fantasyTeamId: string; updates: { name?: string } }>({
    mutationFn: ({ fantasyTeamId, updates }) => testUpdateFantasyTeam(fantasyTeamId, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.detail(variables.fantasyTeamId) });
      
      if (data.success) {
        toast.success('Fantasy team updated', { description: data.message });
      } else {
        toast.error('Failed to update fantasy team', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update fantasy team', { description: error.message });
    },
  });
}

/**
 * Mutation hook for deleting a fantasy team
 */
export function useDeleteFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, string>({
    mutationFn: (fantasyTeamId) => testDeleteFantasyTeam(fantasyTeamId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      if (data.success) {
        toast.success('Fantasy team deleted', { description: data.message });
      } else {
        toast.error('Failed to delete fantasy team', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to delete fantasy team', { description: error.message });
    },
  });
}

/**
 * Mutation hook for adding a player to a fantasy team
 */
export function useAddPlayerToFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { fantasyTeamId: string; playerId: string; isCaptain?: boolean; isBench?: boolean }>({
    mutationFn: ({ fantasyTeamId, playerId, isCaptain, isBench }) => 
      testAddPlayerToFantasyTeam(fantasyTeamId, playerId, { isCaptain, isBench }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.detail(variables.fantasyTeamId) });
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.lists() });
      // Invalidate available players since one is now taken
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.all });
      
      if (data.success) {
        toast.success('Player added', { description: data.message });
      } else {
        toast.error('Failed to add player', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to add player', { description: error.message });
    },
  });
}

/**
 * Mutation hook for removing a player from a fantasy team
 */
export function useRemovePlayerFromFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { fantasyTeamId: string; playerId: string }>({
    mutationFn: ({ fantasyTeamId, playerId }) => testRemovePlayerFromFantasyTeam(fantasyTeamId, playerId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.detail(variables.fantasyTeamId) });
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.lists() });
      // Invalidate available players since one is now free
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.all });
      
      if (data.success) {
        toast.success('Player removed', { description: data.message });
      } else {
        toast.error('Failed to remove player', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to remove player', { description: error.message });
    },
  });
}

/**
 * Mutation hook for setting team captain
 */
export function useSetFantasyTeamCaptain() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { fantasyTeamId: string; playerId: string }>({
    mutationFn: ({ fantasyTeamId, playerId }) => testSetFantasyTeamCaptain(fantasyTeamId, playerId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.detail(variables.fantasyTeamId) });
      
      if (data.success) {
        toast.success('Captain set', { description: data.message });
      } else {
        toast.error('Failed to set captain', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to set captain', { description: error.message });
    },
  });
}

/**
 * Mutation hook for setting player bench status
 */
export function useSetPlayerBenchStatus() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { fantasyTeamId: string; playerId: string; isBench: boolean }>({
    mutationFn: ({ fantasyTeamId, playerId, isBench }) => testSetPlayerBenchStatus(fantasyTeamId, playerId, isBench),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.detail(variables.fantasyTeamId) });
      
      if (data.success) {
        toast.success(variables.isBench ? 'Moved to bench' : 'Moved to active', { description: data.message });
      } else {
        toast.error('Failed to update player status', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update player status', { description: error.message });
    },
  });
}

