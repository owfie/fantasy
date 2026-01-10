/**
 * TanStack Query hooks for Players
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getPlayersForWeekWithValues, PlayerWithValue } from '@/lib/api/players.api';

export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (filters: string) => [...playerKeys.lists(), { filters }] as const,
  forWeek: (weekId: string, seasonId: string, position?: string) => 
    [...playerKeys.all, 'week', weekId, 'season', seasonId, position || 'all'] as const,
};

/**
 * Hook to fetch players with values for a specific week, optionally filtered by position
 */
export function usePlayersForWeek(
  weekId: string | null,
  seasonId: string | null,
  position?: 'handler' | 'cutter' | 'receiver'
) {
  return useQuery<PlayerWithValue[]>({
    queryKey: playerKeys.forWeek(weekId || '', seasonId || '', position),
    queryFn: () => {
      if (!weekId || !seasonId) {
        throw new Error('Week ID and Season ID are required');
      }
      return getPlayersForWeekWithValues(weekId, seasonId, position);
    },
    enabled: !!weekId && !!seasonId,
  });
}

