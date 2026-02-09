/**
 * Unified hook for fantasy page data fetching
 * Consolidates all data queries into a single source of truth
 * Eliminates the double useFantasyTeamData call pattern
 */

'use client';

import { useMemo } from 'react';
import { useActiveSeason, useFantasyTeams } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotWithPlayersForWeek, useMostRecentSnapshotBeforeWeek, snapshotKeys } from '@/lib/queries/fantasy-snapshots.queries';
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
 * @param isAdmin - If true, fetch all teams (not filtered by owner) for admin debug mode
 */
export function useFantasyPageData(userId?: string | null, isAdmin?: boolean) {
  const queryClient = useQueryClient();

  // Step 1: Fetch base data (always needed)
  const { data: activeSeason, isLoading: isLoadingActiveSeason } = useActiveSeason();
  // For admins: fetch all teams (no owner filter) for debug team switching
  // For regular users: filter teams by current user's ownership
  const ownerIdForQuery = isAdmin ? undefined : userId;
  const { data: fantasyTeams = [], isLoading: isLoadingTeams } = useFantasyTeams(activeSeason?.id || null, ownerIdForQuery);
  const { data: weeks = [], isLoading: isLoadingWeeks } = useWeeks(activeSeason?.id || '');

  // Check if user can bypass transfer window restrictions
  const canBypass = canBypassTransferWindow(userId ?? undefined);

  // Step 2: Get selection (team from URL, week from admin settings)
  // Pass userId so admins default to their own team instead of first team in list
  const {
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,
  } = useFantasyTeamSelection(fantasyTeams, weeks, canBypass, userId);

  // Step 3: Derive week-related values
  // Find the previous week ID for transfer computation
  const { isFirstWeekOfSeason, previousWeekId } = useMemo(() => {
    if (weeks.length === 0 || !selectedWeekId) {
      return { isFirstWeekOfSeason: false, previousWeekId: null };
    }
    
    const currentIndex = weeks.findIndex(w => w.id === selectedWeekId);
    const isFirst = currentIndex === 0;
    const prevId = currentIndex > 0 ? weeks[currentIndex - 1].id : null;
    
    return { isFirstWeekOfSeason: isFirst, previousWeekId: prevId };
  }, [weeks, selectedWeekId]);

  // Step 4: Fetch team-specific data (only when IDs are ready)
  // Current week snapshot
  const { data: snapshotWithPlayers, isLoading: isLoadingSnapshot } = useSnapshotWithPlayersForWeek(
    selectedTeamId || '',
    selectedWeekId || ''
  );

  // Most recent prior snapshot (for budget calculation and transfer computation)
  // This handles skipped weeks - if user didn't save in week 3, we use week 2's snapshot
  const { data: mostRecentPriorSnapshot, isLoading: isLoadingPriorSnapshot } = useMostRecentSnapshotBeforeWeek(
    selectedTeamId || '',
    selectedWeekId || ''
  );

  // Determine if this is effectively the team's first week for transfers
  // True if: Week 1 of season OR team has no prior snapshot at all
  const isFirstWeek = useMemo(() => {
    if (isFirstWeekOfSeason) return true;
    // Only check after loading completes
    if (isLoadingPriorSnapshot) return false;
    // No prior snapshot at all = first week
    if (!mostRecentPriorSnapshot) return true;
    // Virtual snapshot means no real snapshot exists - this is effectively first week
    if (mostRecentPriorSnapshot.snapshot?.id?.startsWith('virtual-')) return true;
    return false;
  }, [isFirstWeekOfSeason, mostRecentPriorSnapshot, isLoadingPriorSnapshot]);

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
    (isLoadingPriorSnapshot && selectedTeamId && selectedWeekId) ||
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
    previousWeekSnapshot: mostRecentPriorSnapshot, // Most recent prior snapshot (handles skipped weeks)
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
