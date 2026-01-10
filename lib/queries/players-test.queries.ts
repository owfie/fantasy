/**
 * TanStack Query mutations for Players Test Operations
 * Wraps test actions that return { success, message, data } format
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  testCreatePlayer,
  testUpdatePlayer,
  testSoftDeletePlayer,
  testHardDeletePlayer,
  testGetPlayer,
  testGetAllPlayers,
  testRestorePlayer,
} from '@/lib/api';
import { testKeys } from './test.queries';

interface TestActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (filters?: string) => [...playerKeys.lists(), { filters }] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (id: string) => [...playerKeys.details(), id] as const,
  allIncludingInactive: () => [...playerKeys.all, 'allIncludingInactive'] as const,
};

/**
 * Mutation hook for test create player
 */
export function useTestCreatePlayer() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, {
    teamId: string;
    firstName: string;
    lastName: string;
    role: 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve';
    startingValue?: number;
    draftOrder?: number;
  }>({
    mutationFn: ({ teamId, firstName, lastName, role, startingValue, draftOrder }) =>
      testCreatePlayer(teamId, firstName, lastName, role, startingValue, draftOrder),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.allIncludingInactive() });
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      if (data.success) {
        toast.success('Player created', { description: data.message });
      } else {
        toast.error('Failed to create player', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to create player', { description: error.message });
    },
  });
}

/**
 * Mutation hook for test update player
 */
export function useTestUpdatePlayer() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, {
    playerId: string;
    updates: {
      team_id?: string;
      first_name?: string;
      last_name?: string;
      player_role?: 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve';
      position?: 'handler' | 'cutter' | 'receiver';
      starting_value?: number;
      draft_order?: number;
    };
  }>({
    mutationFn: ({ playerId, updates }) => testUpdatePlayer(playerId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.allIncludingInactive() });
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: playerKeys.details() });
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      if (data.success) {
        toast.success('Player updated', { description: data.message });
      } else {
        toast.error('Failed to update player', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update player', { description: error.message });
    },
  });
}

/**
 * Mutation hook for test soft delete player
 */
export function useTestSoftDeletePlayer() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, string>({
    mutationFn: (playerId) => testSoftDeletePlayer(playerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.allIncludingInactive() });
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      if (data.success) {
        toast.success('Player soft deleted', { description: data.message });
      } else {
        toast.error('Failed to soft delete player', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to soft delete player', { description: error.message });
    },
  });
}

/**
 * Mutation hook for test hard delete player
 */
export function useTestHardDeletePlayer() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, string>({
    mutationFn: (playerId) => testHardDeletePlayer(playerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.allIncludingInactive() });
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      if (data.success) {
        toast.success('Player permanently deleted', { description: data.message });
      } else {
        toast.error('Failed to delete player', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to delete player', { description: error.message });
    },
  });
}

/**
 * Mutation hook for test restore player
 */
export function useTestRestorePlayer() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, string>({
    mutationFn: (playerId) => testRestorePlayer(playerId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.allIncludingInactive() });
      queryClient.invalidateQueries({ queryKey: playerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
      
      if (data.success) {
        toast.success('Player restored', { description: data.message });
      } else {
        toast.error('Failed to restore player', { description: data.message || data.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to restore player', { description: error.message });
    },
  });
}

/**
 * Mutation hook for test get player by ID (for testing purposes)
 */
export function useTestGetPlayer() {
  return useMutation<TestActionResult, Error, string>({
    mutationFn: (id) => testGetPlayer(id),
  });
}

/**
 * Query hook to fetch all players including inactive (for admin/test views)
 */
import { useQuery } from '@tanstack/react-query';

export function usePlayersIncludingInactive() {
  return useQuery({
    queryKey: playerKeys.allIncludingInactive(),
    queryFn: async () => {
      const result = await testGetAllPlayers();
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

