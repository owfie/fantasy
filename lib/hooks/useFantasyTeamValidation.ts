/**
 * Hook to manage fantasy team validation state
 */

import { useState, useEffect, useMemo } from 'react';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';
import { PlayerWithValue } from '@/lib/api/players.api';
import { validateFantasyTeam } from '@/lib/utils/fantasy-team-validation';
import { createPlayersValueMap } from '@/lib/utils/fantasy-roster-utils';

export function useFantasyTeamValidation(
  draftRoster: DraftRosterPlayer[],
  allPlayers: PlayerWithValue[]
) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const playersValueMap = useMemo(
    () => createPlayersValueMap(allPlayers),
    [allPlayers]
  );

  useEffect(() => {
    if (draftRoster.length === 0) {
      setValidationErrors((prevErrors) => {
        if (prevErrors.length === 0) {
          return prevErrors;
        }
        return [];
      });
      return;
    }

    const validation = validateFantasyTeam(draftRoster, playersValueMap, false);
    
    setValidationErrors((prevErrors) => {
      if (validation.errors.length !== prevErrors.length) {
        return validation.errors;
      }
      
      if (validation.errors.some((err, idx) => err !== prevErrors[idx])) {
        return validation.errors;
      }
      
      return prevErrors;
    });
  }, [draftRoster, playersValueMap]);

  const isValid = validationErrors.length === 0;

  return {
    validationErrors,
    isValid,
  };
}

