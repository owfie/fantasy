/**
 * Hook to manage draft roster state and initialization from snapshots
 */

import { useState, useEffect, useRef } from 'react';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';
import { SnapshotWithPlayers } from '@/lib/api/fantasy-snapshots.api';

export function useDraftRoster(
  snapshotWithPlayers: SnapshotWithPlayers | null | undefined,
  currentWeekId: string | null,
  selectedTeamId: string | null
) {
  const [draftRoster, setDraftRoster] = useState<DraftRosterPlayer[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSnapshotIdRef = useRef<string | null>(null);
  const lastWeekIdRef = useRef<string | null>(null);
  const lastTeamIdRef = useRef<string | null>(null);

  // Initialize draft roster from snapshot when it loads or week/team changes
  // Only reset when snapshot ID, week, or team actually changes (not on refetches)
  useEffect(() => {
    const currentSnapshotId = snapshotWithPlayers?.snapshot?.id || null;
    const snapshotChanged = currentSnapshotId !== lastSnapshotIdRef.current;
    const weekChanged = currentWeekId !== lastWeekIdRef.current;
    const teamChanged = selectedTeamId !== lastTeamIdRef.current;

    if (snapshotChanged || weekChanged || teamChanged) {
      if (snapshotWithPlayers?.players) {
        const roster: DraftRosterPlayer[] = snapshotWithPlayers.players.map(sp => ({
          playerId: sp.player_id,
          position: sp.position,
          isBenched: sp.is_benched,
          isCaptain: sp.is_captain,
        }));
        setDraftRoster(roster);
        setHasUnsavedChanges(false);
      } else {
        // No snapshot exists (new team) - start with empty roster
        setDraftRoster([]);
        setHasUnsavedChanges(false);
      }

      lastSnapshotIdRef.current = currentSnapshotId;
      lastWeekIdRef.current = currentWeekId;
      lastTeamIdRef.current = selectedTeamId;
    }
  }, [snapshotWithPlayers, currentWeekId, selectedTeamId]);

  return {
    draftRoster,
    setDraftRoster,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  };
}

