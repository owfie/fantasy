/**
 * TanStack Query hooks for Fantasy Analytics
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getFantasyTeamAnalytics, FantasyAnalyticsData } from '@/lib/api/fantasy-analytics.api';

export const analyticsKeys = {
  all: ['fantasyAnalytics'] as const,
  bySeason: (seasonId: string) => [...analyticsKeys.all, 'season', seasonId] as const,
};

/**
 * Hook to fetch fantasy team analytics for a season
 * Returns points, value, and budget data for all teams across all weeks
 */
export function useFantasyTeamAnalytics(seasonId: string | null) {
  return useQuery<FantasyAnalyticsData>({
    queryKey: analyticsKeys.bySeason(seasonId || ''),
    queryFn: () => getFantasyTeamAnalytics(seasonId!),
    enabled: !!seasonId,
  });
}
