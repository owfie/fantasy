/**
 * Fantasy Analytics API - Server Actions
 * Provides aggregated fantasy team data for admin analytics
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';

export interface WeekAnalytics {
  weekId: string;
  weekNumber: number;
  points: number | null;
  totalValue: number | null;
  budget: number | null;
  budgetDelta: number | null;
}

export interface TeamAnalytics {
  teamId: string;
  teamName: string;
  ownerName: string | null;
  weeks: WeekAnalytics[];
  totalPoints: number;
}

export interface FantasyAnalyticsData {
  teams: TeamAnalytics[];
  weekNumbers: number[];
}

/**
 * Get fantasy team analytics for a season
 * Returns points, value, and budget data for all teams across all weeks
 */
export async function getFantasyTeamAnalytics(seasonId: string): Promise<FantasyAnalyticsData> {
  const uow = await getUnitOfWork();

  // Get all weeks for the season
  const { data: weeks, error: weeksError } = await uow.getClient()
    .from('weeks')
    .select('id, week_number')
    .eq('season_id', seasonId)
    .order('week_number', { ascending: true });

  if (weeksError) {
    throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
  }

  // Get all fantasy teams with owner info
  const { data: teams, error: teamsError } = await uow.getClient()
    .from('fantasy_teams')
    .select(`
      id,
      name,
      user_profiles!owner_id(display_name)
    `)
    .eq('season_id', seasonId)
    .order('name', { ascending: true });

  if (teamsError) {
    throw new Error(`Failed to fetch teams: ${teamsError.message}`);
  }

  if (!teams || teams.length === 0) {
    return { teams: [], weekNumbers: weeks?.map(w => w.week_number) || [] };
  }

  const teamIds = teams.map(t => t.id);
  const weekIds = weeks?.map(w => w.id) || [];

  // Get all snapshots for these teams
  const { data: snapshots, error: snapshotsError } = await uow.getClient()
    .from('fantasy_team_snapshots')
    .select('fantasy_team_id, week_id, total_value, budget_remaining')
    .in('fantasy_team_id', teamIds)
    .in('week_id', weekIds);

  if (snapshotsError) {
    throw new Error(`Failed to fetch snapshots: ${snapshotsError.message}`);
  }

  // Get all scores for these teams
  const { data: scores, error: scoresError } = await uow.getClient()
    .from('fantasy_team_scores')
    .select('fantasy_team_id, week_id, total_points')
    .in('fantasy_team_id', teamIds)
    .in('week_id', weekIds);

  if (scoresError) {
    throw new Error(`Failed to fetch scores: ${scoresError.message}`);
  }

  // Create lookup maps
  const snapshotMap = new Map<string, { totalValue: number; budgetRemaining: number }>(); // key: `${teamId}-${weekId}`
  snapshots?.forEach(s => {
    snapshotMap.set(`${s.fantasy_team_id}-${s.week_id}`, {
      totalValue: s.total_value,
      budgetRemaining: s.budget_remaining,
    });
  });

  const scoreMap = new Map<string, number>(); // key: `${teamId}-${weekId}`
  scores?.forEach(s => {
    scoreMap.set(`${s.fantasy_team_id}-${s.week_id}`, s.total_points);
  });

  // Build analytics for each team
  const teamAnalytics: TeamAnalytics[] = teams.map(team => {
    // Handle the joined user_profiles - Supabase returns single object for foreign key join
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerProfile = (team as any).user_profiles as { display_name: string | null } | null;
    const ownerName = ownerProfile?.display_name || null;
    let previousBudget: number | null = null;
    let totalPoints = 0;

    const weekAnalytics: WeekAnalytics[] = (weeks || []).map(week => {
      const key = `${team.id}-${week.id}`;
      const snapshot = snapshotMap.get(key);
      const totalValue = snapshot?.totalValue ?? null;
      const budget = snapshot?.budgetRemaining ?? null;
      const points = scoreMap.get(key) ?? null;

      if (points !== null) {
        totalPoints += points;
      }

      const budgetDelta = budget !== null && previousBudget !== null
        ? budget - previousBudget
        : null;

      previousBudget = budget;

      return {
        weekId: week.id,
        weekNumber: week.week_number,
        points,
        totalValue,
        budget,
        budgetDelta,
      };
    });

    return {
      teamId: team.id,
      teamName: team.name,
      ownerName,
      weeks: weekAnalytics,
      totalPoints,
    };
  });

  return {
    teams: teamAnalytics,
    weekNumbers: weeks?.map(w => w.week_number) || [],
  };
}
