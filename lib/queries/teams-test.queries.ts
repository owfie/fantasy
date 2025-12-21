/**
 * TanStack Query mutations for Teams Test Operations
 * Wraps test actions that return { success, message, data } format
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  testCreateTeam,
  testUpdateTeam,
  testSoftDeleteTeam,
  testHardDeleteTeam,
  testGetTeam,
  testGetAllTeams,
  testRestoreTeam,
} from '@/lib/api';
import { teamKeys } from './teams.queries';
import { testKeys } from './test.queries';

interface TestActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Mutation hook for test create team
 */
export function useTestCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { name: string; color?: string }>({
    mutationFn: ({ name, color }) => testCreateTeam(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
    },
  });
}

/**
 * Mutation hook for test update team
 */
export function useTestUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, { teamId: string; updates: { name?: string; color?: string } }>({
    mutationFn: ({ teamId, updates }) => testUpdateTeam(teamId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
    },
  });
}

/**
 * Mutation hook for test soft delete team
 */
export function useTestSoftDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, string>({
    mutationFn: (teamId) => testSoftDeleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
    },
  });
}

/**
 * Mutation hook for test hard delete team
 */
export function useTestHardDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, string>({
    mutationFn: (teamId) => testHardDeleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
    },
  });
}

/**
 * Mutation hook for test restore team
 */
export function useTestRestoreTeam() {
  const queryClient = useQueryClient();

  return useMutation<TestActionResult, Error, string>({
    mutationFn: (teamId) => testRestoreTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.allIncludingDeleted() });
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
      // Invalidate test dashboard since it contains teams data
      queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
    },
  });
}

/**
 * Mutation hook for test get team by ID (for testing purposes)
 */
export function useTestGetTeam() {
  return useMutation<TestActionResult, Error, string>({
    mutationFn: (id) => testGetTeam(id),
  });
}

