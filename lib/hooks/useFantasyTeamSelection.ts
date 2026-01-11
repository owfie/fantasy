/**
 * Hook to manage fantasy team and week selection via URL search params
 * Eliminates useState cascade by deriving selection from URL
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Week } from '@/lib/domain/types';

interface FantasyTeam {
  id: string;
  name: string;
}

export function useFantasyTeamSelection(
  fantasyTeams: FantasyTeam[],
  weeks: Week[]
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read from URL or default to first available
  const urlTeamId = searchParams.get('team');
  const urlWeekId = searchParams.get('week');

  // Derive selected team ID: use URL param if valid, otherwise first team
  const selectedTeamId = useMemo(() => {
    if (urlTeamId && fantasyTeams.some(t => t.id === urlTeamId)) {
      return urlTeamId;
    }
    return fantasyTeams[0]?.id || null;
  }, [urlTeamId, fantasyTeams]);

  // Derive selected week ID: use URL param if valid, otherwise first week
  const selectedWeekId = useMemo(() => {
    if (urlWeekId && weeks.some(w => w.id === urlWeekId)) {
      return urlWeekId;
    }
    return weeks[0]?.id || null;
  }, [urlWeekId, weeks]);

  // Derive selected objects
  const selectedTeam = useMemo(
    () => fantasyTeams.find(t => t.id === selectedTeamId),
    [fantasyTeams, selectedTeamId]
  );
  const selectedWeek = useMemo(
    () => weeks.find(w => w.id === selectedWeekId) || weeks[0],
    [weeks, selectedWeekId]
  );

  // Update URL without full navigation (shallow update)
  const setSelectedTeamId = useCallback((teamId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (teamId) {
      params.set('team', teamId);
    } else {
      params.delete('team');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setSelectedWeekId = useCallback((weekId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (weekId) {
      params.set('week', weekId);
    } else {
      params.delete('week');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return {
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,
  };
}
