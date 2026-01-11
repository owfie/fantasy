/**
 * Unified hook for fantasy page data fetching
 * Consolidates all data queries into a single source of truth
 * Eliminates the double useFantasyTeamData call pattern
 */

'use client';

import { useMemo } from 'react';
import { useActiveSeason, useFantasyTeams } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotWithPlayersForWeek, snapshotKeys } from '@/lib/queries/fantasy-snapshots.queries';
import { useRemainingTransfers, useTransfersByWeek } from '@/lib/queries/transfers.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';
import { usePlayersForWeek } from '@/lib/queries/players.queries';
import { useFantasyTeamSelection } from './useFantasyTeamSelection';
import { useQueryClient } from '@tanstack/react-query';
import { SnapshotWithPlayers } from '@/lib/api/fantasy-snapshots.api';

/**
 * Single unified hook for all fantasy page data
 * Handles data fetching, selection, and loading states in one place
 */
export function useFantasyPageData() {
  const queryClient = useQueryClient();

  // Step 1: Fetch base data (always needed)
  const { data: activeSeason, isLoading: isLoadingActiveSeason } = useActiveSeason();
  const { data: fantasyTeams = [], isLoading: isLoadingTeams } = useFantasyTeams(activeSeason?.id || null);
  const { data: weeks = [], isLoading: isLoadingWeeks } = useWeeks(activeSeason?.id || '');

  // Step 2: Get selection from URL (derived, no useState)
  const {
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,
  } = useFantasyTeamSelection(fantasyTeams, weeks);

  // Step 3: Fetch team-specific data (only when IDs are ready)
  // Using combined snapshot query - eliminates waterfall
  const { data: snapshotWithPlayers, isLoading: isLoadingSnapshot } = useSnapshotWithPlayersForWeek(
    selectedTeamId || '',
    selectedWeekId || ''
  );

  const { data: remainingTransfers, isLoading: isLoadingTransfers } = useRemainingTransfers(
    selectedTeamId || '',
    selectedWeekId || ''
  );

  const { data: weekTransfers = [], isLoading: isLoadingWeekTransfers } = useTransfersByWeek(
    selectedWeekId || ''
  );

  const { data: allPlayers = [], isLoading: isLoadingPlayers } = usePlayersForWeek(
    selectedWeekId || null,
    activeSeason?.id || null,
    undefined // Get all players, filter by position in component
  );

  // Step 4: Derive isFirstWeek from weeks array (no separate query needed)
  const isFirstWeek = useMemo(() => {
    if (weeks.length === 0 || !selectedWeekId) return false;
    return weeks[0]?.id === selectedWeekId;
  }, [weeks, selectedWeekId]);

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
    (isLoadingWeekTransfers && weekTransfers.length === 0 && selectedWeekId) ||
    (isLoadingPlayers && allPlayers.length === 0 && selectedWeekId && activeSeason?.id);

  const isLoading = isLoadingInitial || isLoadingTeamData;

  return {
    // Base data
    activeSeason,
    fantasyTeams,
    weeks,

    // Selection (from URL)
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,

    // Team-specific data
    snapshotWithPlayers,
    remainingTransfers,
    weekTransfers,
    allPlayers,

    // Derived values
    isFirstWeek,

    // Loading states
    isLoading,
    isLoadingInitial,
    isLoadingTeamData,
  };
}
