/**
 * Hook to aggregate all data queries for fantasy team management
 * Handles loading states properly
 */

import { useActiveSeason, useFantasyTeams } from '@/lib/queries/fantasy-teams-test.queries';
import { useSnapshotForWeek, useSnapshotWithPlayers } from '@/lib/queries/fantasy-snapshots.queries';
import { useRemainingTransfers, useTransfersByWeek } from '@/lib/queries/transfers.queries';
import { useWeeks } from '@/lib/queries/seasons.queries';
import { usePlayersForWeek } from '@/lib/queries/players.queries';

export function useFantasyTeamData(
  selectedTeamId: string | null,
  currentWeekId: string | null
) {
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

  const isLoading = 
    isLoadingTeams ||
    isLoadingWeeks ||
    isLoadingSnapshot ||
    isLoadingSnapshotWithPlayers ||
    isLoadingTransfers ||
    isLoadingWeekTransfers ||
    isLoadingPlayers;

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

