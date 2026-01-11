/**
 * Hook to manage fantasy team and week selection
 * Auto-selects first team/week when available
 */

import { useState, useEffect, useMemo } from 'react';
import { Week } from '@/lib/domain/types';

interface FantasyTeam {
  id: string;
  name: string;
}

export function useFantasyTeamSelection(
  fantasyTeams: FantasyTeam[],
  weeks: Week[]
) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  // Auto-select first team when available
  useEffect(() => {
    if (fantasyTeams.length > 0) {
      const targetTeamId = fantasyTeams[0]?.id || null;
      if (!selectedTeamId || !fantasyTeams.find(t => t.id === selectedTeamId)) {
        if (selectedTeamId !== targetTeamId) {
          setSelectedTeamId(targetTeamId);
        }
      }
    } else {
      if (selectedTeamId !== null) {
        setSelectedTeamId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fantasyTeams]);

  // Auto-select first week when available
  const firstWeekId = weeks[0]?.id || null;
  const currentWeekId = selectedWeekId || firstWeekId;
  const selectedWeek = useMemo(
    () => weeks.find(w => w.id === currentWeekId) || weeks[0],
    [weeks, currentWeekId]
  );
  const selectedTeam = useMemo(
    () => fantasyTeams.find(t => t.id === selectedTeamId),
    [fantasyTeams, selectedTeamId]
  );

  return {
    selectedTeamId,
    selectedWeekId: currentWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,
  };
}
