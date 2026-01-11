/**
 * Hook to manage draft roster state and initialization from snapshots
 * Simplified to use a single derived key for initialization
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

  // Single derived key for initialization - simplifies 3 refs into 1 comparison
  const initKey = `${snapshotWithPlayers?.snapshot?.id || 'no-snapshot'}-${currentWeekId || 'no-week'}-${selectedTeamId || 'no-team'}`;
  const lastInitKeyRef = useRef<string | null>(null);

  // Initialize draft roster when the init key changes
  useEffect(() => {
    // Skip if key hasn't changed (prevents duplicate initializations)
    if (initKey === lastInitKeyRef.current) {
      return;
    }

    // Update the ref to track current init key
    lastInitKeyRef.current = initKey;

    // Initialize roster from snapshot or clear it
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
  }, [initKey, snapshotWithPlayers?.players]);

  return {
    draftRoster,
    setDraftRoster,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  };
}
