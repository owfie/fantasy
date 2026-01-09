/**
 * TanStack Query hooks for Seasons
 * Provides data fetching, caching, and mutation management for seasons and season players
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSeasons,
  getSeason,
  getActiveSeason,
  createSeason,
  updateSeason,
  deleteSeason,
  setSeasonActive,
  getSeasonPlayers,
  addPlayerToSeason,
  addPlayersToSeason,
  removePlayerFromSeason,
  updateSeasonPlayerValue,
  setSeasonPlayerActive,
  updateSeasonPlayerTeam,
  getWeeks,
  createWeek,
  createWeeks,
  updateWeek,
  deleteWeek,
} from '@/lib/api';
import { Season, InsertSeason, UpdateSeason, Week, InsertWeek, UpdateWeek } from '@/lib/domain/types';
import { SeasonPlayerWithPlayer } from '@/lib/domain/repositories';
import { testKeys } from './test.queries';

export const seasonKeys = {
  all: ['seasons'] as const,
  lists: () => [...seasonKeys.all, 'list'] as const,
  list: (filters?: string) => [...seasonKeys.lists(), { filters }] as const,
  details: () => [...seasonKeys.all, 'detail'] as const,
  detail: (id: string) => [...seasonKeys.details(), id] as const,
  active: () => [...seasonKeys.all, 'active'] as const,
  players: (seasonId: string) => [...seasonKeys.all, 'players', seasonId] as const,
  weeks: (seasonId: string) => [...seasonKeys.all, 'weeks', seasonId] as const,
};

// ============================================
// Season Query Hooks
// ============================================

/**
 * Query hook to fetch all seasons
 */
export function useSeasons() {
  return useQuery({
    queryKey: seasonKeys.lists(),
    queryFn: () => getSeasons(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Query hook to fetch a single season by ID
 */
export function useSeason(id: string) {
  return useQuery({
    queryKey: seasonKeys.detail(id),
    queryFn: () => getSeason(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Query hook to fetch the active season
 */
export function useActiveSeason() {
  return useQuery({
    queryKey: seasonKeys.active(),
    queryFn: () => getActiveSeason(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Query hook to fetch players for a season
 */
export function useSeasonPlayers(seasonId: string) {
  return useQuery({
    queryKey: seasonKeys.players(seasonId),
    queryFn: () => getSeasonPlayers(seasonId),
    enabled: !!seasonId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================
// Season Mutation Hooks
// ============================================

/**
 * Mutation hook to create a new season
 */
export function useCreateSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertSeason) => createSeason(data),
    onMutate: async (newSeason) => {
      await queryClient.cancelQueries({ queryKey: seasonKeys.lists() });
      const previousSeasons = queryClient.getQueryData<Season[]>(seasonKeys.lists());

      queryClient.setQueryData<Season[]>(seasonKeys.lists(), (old = []) => [
        ...old,
        { ...newSeason, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Season,
      ]);

      return { previousSeasons };
    },
    onError: (err, _newSeason, context) => {
      if (context?.previousSeasons) {
        queryClient.setQueryData(seasonKeys.lists(), context.previousSeasons);
      }
      toast.error('Failed to create season', { description: err.message });
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() });
        queryClient.invalidateQueries({ queryKey: seasonKeys.active() });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        queryClient.setQueryData(seasonKeys.detail(result.data.id), result.data);
        toast.success('Season created', { description: `Season "${result.data.name}" has been created` });
      } else {
        toast.error('Failed to create season', { description: result.message || result.error });
      }
    },
  });
}

/**
 * Mutation hook to update a season
 */
export function useUpdateSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSeason) => updateSeason(data),
    onMutate: async (updatedSeason) => {
      await queryClient.cancelQueries({ queryKey: seasonKeys.detail(updatedSeason.id) });
      await queryClient.cancelQueries({ queryKey: seasonKeys.lists() });

      const previousSeason = queryClient.getQueryData<Season>(seasonKeys.detail(updatedSeason.id));
      const previousSeasons = queryClient.getQueryData<Season[]>(seasonKeys.lists());

      if (previousSeason) {
        queryClient.setQueryData<Season>(seasonKeys.detail(updatedSeason.id), {
          ...previousSeason,
          ...updatedSeason,
        });
      }

      queryClient.setQueryData<Season[]>(seasonKeys.lists(), (old = []) =>
        old.map((season) => (season.id === updatedSeason.id ? { ...season, ...updatedSeason } : season))
      );

      return { previousSeason, previousSeasons };
    },
    onError: (err, updatedSeason, context) => {
      if (context?.previousSeason) {
        queryClient.setQueryData(seasonKeys.detail(updatedSeason.id), context.previousSeason);
      }
      if (context?.previousSeasons) {
        queryClient.setQueryData(seasonKeys.lists(), context.previousSeasons);
      }
      toast.error('Failed to update season', { description: err.message });
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.detail(result.data.id) });
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() });
        queryClient.invalidateQueries({ queryKey: seasonKeys.active() });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        toast.success('Season updated', { description: `Season "${result.data.name}" has been updated` });
      } else {
        toast.error('Failed to update season', { description: result.message || result.error });
      }
    },
  });
}

/**
 * Mutation hook to delete a season
 */
export function useDeleteSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSeason(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: seasonKeys.lists() });
      await queryClient.cancelQueries({ queryKey: seasonKeys.detail(id) });

      const previousSeasons = queryClient.getQueryData<Season[]>(seasonKeys.lists());

      queryClient.setQueryData<Season[]>(seasonKeys.lists(), (old = []) =>
        old.filter((season) => season.id !== id)
      );
      queryClient.removeQueries({ queryKey: seasonKeys.detail(id) });

      return { previousSeasons };
    },
    onError: (err, _id, context) => {
      if (context?.previousSeasons) {
        queryClient.setQueryData(seasonKeys.lists(), context.previousSeasons);
      }
      toast.error('Failed to delete season', { description: err.message });
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() });
        queryClient.invalidateQueries({ queryKey: seasonKeys.active() });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        toast.success('Season deleted', { description: 'Season has been permanently deleted' });
      } else {
        toast.error('Failed to delete season', { description: result.message || result.error });
      }
    },
  });
}

/**
 * Mutation hook to set a season as active
 */
export function useSetSeasonActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => setSeasonActive(id),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.lists() });
        queryClient.invalidateQueries({ queryKey: seasonKeys.active() });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        toast.success('Season activated', { description: `"${result.data.name}" is now the active season` });
      } else {
        toast.error('Failed to set active season', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to set active season', { description: error.message });
    },
  });
}

// ============================================
// Season Player Mutation Hooks
// ============================================

/**
 * Mutation hook to add a player to a season
 */
export function useAddPlayerToSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, playerId, startingValue }: { seasonId: string; playerId: string; startingValue: number }) =>
      addPlayerToSeason(seasonId, playerId, startingValue),
    onSuccess: (result, { seasonId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.players(seasonId) });
        toast.success('Player added', { description: result.message });
      } else {
        toast.error('Failed to add player', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to add player', { description: error.message });
    },
  });
}

/**
 * Mutation hook to add multiple players to a season (with optional team assignment)
 */
export function useAddPlayersToSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, players }: { seasonId: string; players: Array<{ playerId: string; startingValue: number; teamId?: string }> }) =>
      addPlayersToSeason(seasonId, players),
    onSuccess: (result, { seasonId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.players(seasonId) });
        toast.success('Players added', { description: result.message });
      } else {
        toast.error('Failed to add players', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to add players', { description: error.message });
    },
  });
}

/**
 * Mutation hook to remove a player from a season
 */
export function useRemovePlayerFromSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, playerId }: { seasonId: string; playerId: string }) =>
      removePlayerFromSeason(seasonId, playerId),
    onMutate: async ({ seasonId, playerId }) => {
      await queryClient.cancelQueries({ queryKey: seasonKeys.players(seasonId) });
      const previousPlayers = queryClient.getQueryData<SeasonPlayerWithPlayer[]>(seasonKeys.players(seasonId));

      queryClient.setQueryData<SeasonPlayerWithPlayer[]>(seasonKeys.players(seasonId), (old = []) =>
        old.filter((sp) => sp.player_id !== playerId)
      );

      return { previousPlayers, seasonId };
    },
    onError: (err, { seasonId }, context) => {
      if (context?.previousPlayers) {
        queryClient.setQueryData(seasonKeys.players(seasonId), context.previousPlayers);
      }
      toast.error('Failed to remove player', { description: err.message });
    },
    onSuccess: (result, { seasonId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.players(seasonId) });
        toast.success('Player removed', { description: result.message });
      } else {
        toast.error('Failed to remove player', { description: result.message || result.error });
      }
    },
  });
}

/**
 * Mutation hook to update a player's value in a season
 */
export function useUpdateSeasonPlayerValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, playerId, startingValue }: { seasonId: string; playerId: string; startingValue: number }) =>
      updateSeasonPlayerValue(seasonId, playerId, startingValue),
    onSuccess: (result, { seasonId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.players(seasonId) });
        toast.success('Value updated', { description: result.message });
      } else {
        toast.error('Failed to update value', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update value', { description: error.message });
    },
  });
}

/**
 * Mutation hook to set a player's active status in a season
 */
export function useSetSeasonPlayerActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, playerId, isActive }: { seasonId: string; playerId: string; isActive: boolean }) =>
      setSeasonPlayerActive(seasonId, playerId, isActive),
    onSuccess: (result, { seasonId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.players(seasonId) });
        toast.success(result.message);
      } else {
        toast.error('Failed to update player status', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update player status', { description: error.message });
    },
  });
}

/**
 * Mutation hook to update a player's team assignment in a season
 */
export function useUpdateSeasonPlayerTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seasonId, playerId, teamId }: { seasonId: string; playerId: string; teamId: string | null }) =>
      updateSeasonPlayerTeam(seasonId, playerId, teamId),
    onSuccess: (result, { seasonId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.players(seasonId) });
        toast.success('Team updated', { description: result.message });
      } else {
        toast.error('Failed to update team', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update team', { description: error.message });
    },
  });
}

// ============================================
// Week Query Hooks
// ============================================

/**
 * Query hook to fetch weeks for a season
 */
export function useWeeks(seasonId: string) {
  return useQuery({
    queryKey: seasonKeys.weeks(seasonId),
    queryFn: () => getWeeks(seasonId),
    enabled: !!seasonId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================
// Week Mutation Hooks
// ============================================

/**
 * Mutation hook to create a new week
 */
export function useCreateWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InsertWeek) => createWeek(data),
    onSuccess: (result, data) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.weeks(data.season_id) });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        toast.success('Week created', { description: result.message });
      } else {
        toast.error('Failed to create week', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to create week', { description: error.message });
    },
  });
}

/**
 * Mutation hook to batch create weeks
 */
export function useCreateWeeks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      seasonId: string;
      startWeekNumber: number;
      count: number;
      firstGameDate: string;
      namePattern?: string;
      isDraftWeek?: boolean;
    }) => createWeeks(data),
    onSuccess: (result, data) => {
      if (result.success && result.data) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.weeks(data.seasonId) });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        toast.success('Weeks created', { description: result.message });
      } else {
        toast.error('Failed to create weeks', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to create weeks', { description: error.message });
    },
  });
}

/**
 * Mutation hook to update a week
 */
export function useUpdateWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWeek) => updateWeek(data),
    onSuccess: (result, data) => {
      if (result.success && result.data) {
        // Need to get season_id from the updated week to invalidate the right cache
        queryClient.invalidateQueries({ queryKey: seasonKeys.weeks(result.data.season_id) });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        toast.success('Week updated', { description: result.message });
      } else {
        toast.error('Failed to update week', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to update week', { description: error.message });
    },
  });
}

/**
 * Mutation hook to delete a week
 */
export function useDeleteWeek() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ weekId, seasonId }: { weekId: string; seasonId: string }) => deleteWeek(weekId),
    onSuccess: (result, { seasonId }) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: seasonKeys.weeks(seasonId) });
        queryClient.invalidateQueries({ queryKey: testKeys.dashboard() });
        toast.success('Week deleted', { description: result.message });
      } else {
        toast.error('Failed to delete week', { description: result.message || result.error });
      }
    },
    onError: (error) => {
      toast.error('Failed to delete week', { description: error.message });
    },
  });
}

