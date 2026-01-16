/**
 * Unified hook for fantasy page data fetching
 * Consolidates all data queries into a single source of truth
 * Eliminates the double useFantasyTeamData call pattern
 */

'use client';

import { useMemo } from 'react';
import { useActiveSeason, useFantasyTeams } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotWithPlayersForWeek, snapshotKeys } from '@/lib/queries/fantasy-snapshots.queries';
import { useRemainingTransfers } from '@/lib/queries/transfers.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';
import { usePlayersForWeek } from '@/lib/queries/players.queries';
import { useFantasyTeamSelection } from './useFantasyTeamSelection';
import { useQueryClient } from '@tanstack/react-query';
import { SnapshotWithPlayers } from '@/lib/api/fantasy-snapshots.api';
import { canBypassTransferWindow } from '@/lib/config/transfer-whitelist';

/**
 * Single unified hook for all fantasy page data
 * Handles data fetching, selection, and loading states in one place
 * @param userId - Current user's ID to filter teams by ownership
 */
export function useFantasyPageData(userId?: string | null) {
  const queryClient = useQueryClient();

  // Step 1: Fetch base data (always needed)
  const { data: activeSeason, isLoading: isLoadingActiveSeason } = useActiveSeason();
  // Filter teams by current user's ownership
  const { data: fantasyTeams = [], isLoading: isLoadingTeams } = useFantasyTeams(activeSeason?.id || null, userId);
  const { data: weeks = [], isLoading: isLoadingWeeks } = useWeeks(activeSeason?.id || '');

  // Check if user can bypass transfer window restrictions
  const canBypass = canBypassTransferWindow(userId ?? undefined);

  // Step 2: Get selection (team from URL, week from admin settings)
  const {
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,
  } = useFantasyTeamSelection(fantasyTeams, weeks, canBypass);

  // Step 3: Derive week-related values
  // Find the previous week ID for transfer computation
  const { isFirstWeek, previousWeekId } = useMemo(() => {
    if (weeks.length === 0 || !selectedWeekId) {
      return { isFirstWeek: false, previousWeekId: null };
    }
    
    const currentIndex = weeks.findIndex(w => w.id === selectedWeekId);
    const isFirst = currentIndex === 0;
    const prevId = currentIndex > 0 ? weeks[currentIndex - 1].id : null;
    
    return { isFirstWeek: isFirst, previousWeekId: prevId };
  }, [weeks, selectedWeekId]);

  // Step 4: Fetch team-specific data (only when IDs are ready)
  // Current week snapshot
  const { data: snapshotWithPlayers, isLoading: isLoadingSnapshot } = useSnapshotWithPlayersForWeek(
    selectedTeamId || '',
    selectedWeekId || ''
  );

  // Previous week snapshot (for computing transfers)
  const { data: previousWeekSnapshot, isLoading: isLoadingPreviousSnapshot } = useSnapshotWithPlayersForWeek(
    selectedTeamId || '',
    previousWeekId || ''
  );

  const { data: remainingTransfers, isLoading: isLoadingTransfers } = useRemainingTransfers(
    selectedTeamId || '',
    selectedWeekId || ''
  );

  const { data: allPlayers = [], isLoading: isLoadingPlayers } = usePlayersForWeek(
    selectedWeekId || null,
    activeSeason?.id || null,
    undefined // Get all players, filter by position in component
  );

  // Step 5: Calculate loading states
  // Check if snapshotWithPlayers has cached data
  const snapshotWithPlayersCached = selectedTeamId && selectedWeekId
    ? queryClient.getQueryData<SnapshotWithPlayers | null>(snapshotKeys.byWeek(selectedTeamId, selectedWeekId))
    : undefined;
  const hasSnapshotData = snapshotWithPlayers !== undefined || snapshotWithPlayersCached !== undefined;

  // Only show loading during initial data load, not on background refetches
  const isLoadingInitial =
    isLoadingActiveSeason ||
    (isLoadingTeams && fantasyTeams.length === 0) ||
    (isLoadingWeeks && weeks.length === 0);

  const isLoadingTeamData =
    (isLoadingSnapshot && selectedTeamId && selectedWeekId && !hasSnapshotData) ||
    (isLoadingTransfers && remainingTransfers === undefined && selectedTeamId && selectedWeekId) ||
    (isLoadingPreviousSnapshot && previousWeekId && selectedTeamId) ||
    (isLoadingPlayers && allPlayers.length === 0 && selectedWeekId && activeSeason?.id);

  const isLoading = isLoadingInitial || isLoadingTeamData;

  return {
    // Base data
    activeSeason,
    fantasyTeams,
    weeks,

    // Selection (team from URL, week from admin settings)
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,

    // Team-specific data
    snapshotWithPlayers,
    previousWeekSnapshot,
    remainingTransfers,
    allPlayers,

    // Derived values
    isFirstWeek,
    previousWeekId,
    canBypass,

    // Loading states
    isLoading,
    isLoadingInitial,
    isLoadingTeamData,
  };
}
