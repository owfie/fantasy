/**
 * Hook to aggregate all data queries for fantasy team management
 * Handles loading states properly
 */

import { useActiveSeason, useFantasyTeams } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotForWeek, useSnapshotWithPlayers, snapshotKeys } from '@/lib/queries/fantasy-snapshots.queries';
import { useRemainingTransfers, useTransfersByWeek } from '@/lib/queries/transfers.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';
import { usePlayersForWeek } from '@/lib/queries/players.queries';
import { useQueryClient } from '@tanstack/react-query';
import { SnapshotWithPlayers } from '@/lib/api/fantasy-snapshots.api';
import { Season } from '@/lib/domain/types';

export function useFantasyTeamData(
  selectedTeamId: string | null,
  currentWeekId: string | null
) {
  const queryClient = useQueryClient();
  const { data: activeSeason } = useActiveSeason();
  
  const { data: fantasyTeams = [], isLoading: isLoadingTeams } = useFantasyTeams(activeSeason?.id || null);
  const { data: weeks = [], isLoading: isLoadingWeeks } = useWeeks(activeSeason?.id || '');
  
  const { data: snapshot, isLoading: isLoadingSnapshot } = useSnapshotForWeek(
    selectedTeamId || '',
    currentWeekId || ''
  );
  const { data: snapshotWithPlayers, isLoading: isLoadingSnapshotWithPlayers } = useSnapshotWithPlayers(
    snapshot?.id || ''
  );
  
  const { data: remainingTransfers, isLoading: isLoadingTransfers } = useRemainingTransfers(
    selectedTeamId || '',
    currentWeekId || ''
  );
  const { data: weekTransfers = [], isLoading: isLoadingWeekTransfers } = useTransfersByWeek(
    currentWeekId || ''
  );
  
  const { data: allPlayers = [], isLoading: isLoadingPlayers } = usePlayersForWeek(
    currentWeekId || null,
    activeSeason?.id || null,
    undefined // Get all players, filter by position in component
  );

  // Check if snapshotWithPlayers has cached data - if yes, don't show loading even if query is loading
  // This prevents loading screen flash when snapshot ID changes but data is already cached
  const snapshotWithPlayersCached = snapshot?.id 
    ? queryClient.getQueryData<SnapshotWithPlayers | null>(snapshotKeys.detail(snapshot.id))
    : undefined;
  const hasSnapshotWithPlayersData = snapshotWithPlayers !== undefined || snapshotWithPlayersCached !== undefined;

  // Only show loading during initial data load, not on background refetches after mutations
  // For snapshotWithPlayers: check cache first - if cached data exists, don't show loading
  // This prevents loading screen flash when queries are invalidated after save but data is already cached
  const snapshotWithPlayersLoadingCondition = isLoadingSnapshotWithPlayers && snapshot?.id && !hasSnapshotWithPlayersData;
  
  const isLoading = 
    (isLoadingTeams && fantasyTeams.length === 0) ||
    (isLoadingWeeks && weeks.length === 0) ||
    (isLoadingSnapshot && !snapshot && selectedTeamId && currentWeekId) ||
    // For snapshotWithPlayers: only show loading if we have a snapshot ID but no cached data exists
    snapshotWithPlayersLoadingCondition ||
    (isLoadingTransfers && remainingTransfers === undefined && selectedTeamId && currentWeekId) ||
    (isLoadingWeekTransfers && weekTransfers.length === 0 && currentWeekId) ||
    (isLoadingPlayers && allPlayers.length === 0 && currentWeekId && activeSeason?.id);

  return {
    activeSeason,
    fantasyTeams,
    weeks,
    snapshot,
    snapshotWithPlayers,
    remainingTransfers,
    weekTransfers,
    allPlayers,
    isLoading,
  };
}

