/**
 * Hook to manage fantasy team validation state
 */

import { useState, useEffect, useMemo } from 'react';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';
import { PlayerWithValue } from '@/lib/api/players.api';
import { validateFantasyTeam } from '@/lib/utils/fantasy-team-validation';
import { createPlayersValueMap } from '@/lib/utils/fantasy-roster-utils';

/**
 * @param draftRoster - Current roster players
 * @param allPlayers - All available players with values
 * @param currentBudget - Optional: The actual calculated budget (for week 2+). Pass this to avoid incorrect $550 cap validation.
 */
export function useFantasyTeamValidation(
  draftRoster: DraftRosterPlayer[],
  allPlayers: PlayerWithValue[],
  currentBudget?: number
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

    const validation = validateFantasyTeam(draftRoster, playersValueMap, false, currentBudget);

    setValidationErrors((prevErrors) => {
      if (validation.errors.length !== prevErrors.length) {
        return validation.errors;
      }

      if (validation.errors.some((err, idx) => err !== prevErrors[idx])) {
        return validation.errors;
      }

      return prevErrors;
    });
  }, [draftRoster, playersValueMap, currentBudget]);

  const isValid = validationErrors.length === 0;

  return {
    validationErrors,
    isValid,
  };
}

