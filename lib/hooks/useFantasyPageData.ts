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

  // Previous week snapshot (for computing transfers)
  const { data: previousWeekSnapshot, isLoading: isLoadingPreviousSnapshot } = useSnapshotWithPlayersForWeek(
    selectedTeamId || '',
    previousWeekId || ''
  );

  // Determine if this is effectively the team's first week for transfers
  // True if: Week 1 of season OR team has no REAL snapshot for previous week
  // A "virtual" snapshot (id starts with "virtual-") means no actual snapshot was recorded
  const isFirstWeek = useMemo(() => {
    if (isFirstWeekOfSeason) return true;
    // Only check after loading completes
    if (isLoadingPreviousSnapshot) return false;
    // No previous week means it's first week of season (already handled above)
    if (!previousWeekId) return false;
    // No snapshot data at all = first week
    if (!previousWeekSnapshot) return true;
    // Virtual snapshot means no real snapshot exists - this is effectively first week
    if (previousWeekSnapshot.snapshot?.id?.startsWith('virtual-')) return true;
    return false;
  }, [isFirstWeekOfSeason, previousWeekId, previousWeekSnapshot, isLoadingPreviousSnapshot]);

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
