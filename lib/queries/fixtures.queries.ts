/**
 * TanStack Query hooks for Fixtures
 * Provides data fetching, caching, and mutation management for fixtures
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getFixtures, getFixture, updateFixture } from '@/lib/api';
import { GameWithTeams, GameWithDetails } from '@/lib/domain/repositories/games.repository';
import { UpdateGame } from '@/lib/domain/types';

export const fixtureKeys = {
  all: ['fixtures'] as const,
  lists: () => [...fixtureKeys.all, 'list'] as const,
  list: () => [...fixtureKeys.lists()] as const,
  details: () => [...fixtureKeys.all, 'detail'] as const,
  detail: (id: string) => [...fixtureKeys.details(), id] as const,
};

/**
 * Query hook to fetch all fixtures
 */
export function useFixtures() {
  return useQuery({
    queryKey: fixtureKeys.list(),
    queryFn: () => getFixtures(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query hook to fetch a single fixture with details
 */
export function useFixture(id: string) {
  return useQuery({
    queryKey: fixtureKeys.detail(id),
    queryFn: () => getFixture(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook to update a fixture (e.g., broadcast link)
 */
export function useUpdateFixture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateGame) => updateFixture(data),
    onMutate: async (updatedFixture) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: fixtureKeys.detail(updatedFixture.id) });
      await queryClient.cancelQueries({ queryKey: fixtureKeys.list() });

      // Snapshot previous values
      const previousFixture = queryClient.getQueryData<GameWithDetails>(fixtureKeys.detail(updatedFixture.id));
      const previousFixtures = queryClient.getQueryData<GameWithTeams[]>(fixtureKeys.list());

      // Optimistically update single fixture
      if (previousFixture) {
        queryClient.setQueryData<GameWithDetails>(fixtureKeys.detail(updatedFixture.id), {
          ...previousFixture,
          ...updatedFixture,
        });
      }

      // Optimistically update fixtures list
      queryClient.setQueryData<GameWithTeams[]>(fixtureKeys.list(), (old = []) =>
        old.map((fixture) => (fixture.id === updatedFixture.id ? { ...fixture, ...updatedFixture } : fixture))
      );

      return { previousFixture, previousFixtures };
    },
    onError: (err, updatedFixture, context) => {
      // Rollback on error
      if (context?.previousFixture) {
        queryClient.setQueryData(fixtureKeys.detail(updatedFixture.id), context.previousFixture);
      }
      if (context?.previousFixtures) {
        queryClient.setQueryData(fixtureKeys.list(), context.previousFixtures);
      }
      toast.error('Failed to update fixture', { description: err.message });
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: fixtureKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: fixtureKeys.list() });
      
      toast.success('Fixture updated', { description: 'Fixture has been updated' });
    },
  });
}

