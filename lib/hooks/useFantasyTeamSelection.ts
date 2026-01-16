/**
 * Hook to manage fantasy team and week selection
 * Team selection uses URL params, week is determined by admin settings
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Week } from '@/lib/domain/types';

interface FantasyTeam {
  id: string;
  name: string;
  emoji?: string;
}

/**
 * Get the current week based on admin settings:
 * - Regular users: only returns a week with transfer_window_open === true
 * - Bypass users: falls back to latest week if no window is open
 */
function getCurrentWeek(weeks: Week[], canBypass: boolean): Week | null {
  if (weeks.length === 0) return null;

  // Try to find a week with an open transfer window
  const openWindowWeek = weeks.find(w => w.transfer_window_open);
  if (openWindowWeek) return openWindowWeek;

  // Only bypass users get fallback to latest week
  if (canBypass) {
    const sortedByNumber = [...weeks].sort((a, b) => b.week_number - a.week_number);
    return sortedByNumber[0] || null;
  }

  // Regular users: no valid week available
  return null;
}

export function useFantasyTeamSelection(
  fantasyTeams: FantasyTeam[],
  weeks: Week[],
  canBypass: boolean = false
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read team from URL (week is no longer URL-controlled)
  const urlTeamId = searchParams.get('team');

  // Derive selected team ID: use URL param if valid, otherwise first team
  const selectedTeamId = useMemo(() => {
    if (urlTeamId && fantasyTeams.some(t => t.id === urlTeamId)) {
      return urlTeamId;
    }
    return fantasyTeams[0]?.id || null;
  }, [urlTeamId, fantasyTeams]);

  // Week is determined by admin settings, not URL
  const selectedWeek = useMemo(() => getCurrentWeek(weeks, canBypass), [weeks, canBypass]);
  const selectedWeekId = selectedWeek?.id || null;

  // Derive selected team object
  const selectedTeam = useMemo(
    () => fantasyTeams.find(t => t.id === selectedTeamId),
    [fantasyTeams, selectedTeamId]
  );

  // Update URL without full navigation (shallow update) - only for team
  const setSelectedTeamId = useCallback((teamId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (teamId) {
      params.set('team', teamId);
    } else {
      params.delete('team');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // Week selection is no longer user-controllable - it's admin-controlled
  // This is a no-op but kept for API compatibility
  const setSelectedWeekId = useCallback((_weekId: string | null) => {
    // No-op: week is determined by admin settings
  }, []);

  return {
    selectedTeamId,
    selectedWeekId,
    selectedTeam,
    selectedWeek,
    setSelectedTeamId,
    setSelectedWeekId,
  };
}
