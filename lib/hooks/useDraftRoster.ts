/**
 * Hook to manage draft roster state and initialization from snapshots
 */

import { useState, useEffect } from 'react';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';
import { FantasyPosition } from '@/lib/domain/types';

interface SnapshotPlayer {
  player_id: string;
  position: FantasyPosition;
  is_benched: boolean;
  is_captain: boolean;
}

interface SnapshotWithPlayers {
  players?: SnapshotPlayer[];
}

export function useDraftRoster(
  snapshotWithPlayers: SnapshotWithPlayers | undefined,
  currentWeekId: string | null,
  selectedTeamId: string | null
) {
  const [draftRoster, setDraftRoster] = useState<DraftRosterPlayer[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize draft roster from snapshot when it loads or week/team changes
  useEffect(() => {
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
      setDraftRoster([]);
      setHasUnsavedChanges(false);
    }
  }, [snapshotWithPlayers, currentWeekId, selectedTeamId]);

  return {
    draftRoster,
    setDraftRoster,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  };
}

