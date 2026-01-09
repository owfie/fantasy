/**
 * TanStack Query hooks for Games
 * Provides data fetching, caching, and mutation management for games
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getGamesByWeek,
  createGame,
  updateGame,
  deleteGame,
} from '@/lib/api';
import { Game, InsertGame, UpdateGame } from '@/lib/domain/types';
import { seasonKeys } from './seasons.queries';

export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  list: (filters?: string) => [...gameKeys.lists(), { filters }] as const,
  byWeek: (weekId: string) => [...gameKeys.all, 'week', weekId] as const,
  details: () => [...gameKeys.all, 'detail'] as const,
  detail: (id: string) => [...gameKeys.details(), id] as const,
};

// ============================================
// Game Query Hooks
// ============================================

/**
 * Query hook to fetch games for a week
 */
export function useGamesByWeek(weekId: string) {
  return useQuery({
    queryKey: gameKeys.byWeek(weekId),
    queryFn: () => getGamesByWeek(weekId),
    enabled: !!weekId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================
// Game Mutation Hooks
// ============================================

/**
 * Mutation hook to create a new game
 */
export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertGame) => createGame(data),
    onSuccess: (result, data) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: gameKeys.byWeek(data.week_id) });
        toast.success('Game created', { description: result.message });
      } else {
        toast.error('Failed to create game', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to create game', { description: error.message });
    },
  });
}

/**
 * Mutation hook to update a game
 */
export function useUpdateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateGame) => updateGame(data),
    onSuccess: (result, data) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: gameKeys.byWeek(result.data.week_id) });
        queryClient.invalidateQueries({ queryKey: gameKeys.detail(data.id) });
        toast.success('Game updated', { description: result.message });
      } else {
        toast.error('Failed to update game', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update game', { description: error.message });
    },
  });
}

/**
 * Mutation hook to delete a game
 */
export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, weekId }: { gameId: string; weekId: string }) => deleteGame(gameId),
    onSuccess: (result, { weekId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: gameKeys.byWeek(weekId) });
        toast.success('Game deleted', { description: result.message });
      } else {
        toast.error('Failed to delete game', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to delete game', { description: error.message });
    },
  });
}

