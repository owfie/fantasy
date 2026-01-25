/**
 * Fantasy Leaderboard API - Server Actions
 * Provides leaderboard data for fantasy teams
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';

export interface LeaderboardTeam {
  rank: number;
  teamId: string;
  teamName: string;
  emoji: string;
  ownerName: string | null;
  totalPoints: number;
  currentValue: number | null;
}

export interface LeaderboardData {
  teams: LeaderboardTeam[];
}

/**
 * Get leaderboard data for a season
 * Returns teams sorted by total points descending with ranks assigned
 */
export async function getLeaderboardData(seasonId: string): Promise<LeaderboardData> {
  const uow = await getUnitOfWork();

  // Get all fantasy teams with owner info for this season
  const { data: teams, error: teamsError } = await uow.getClient()
    .from('fantasy_teams')
    .select(`
      id,
      name,
      emoji,
      user_profiles!owner_id(display_name)
    `)
    .eq('season_id', seasonId)
    .order('name', { ascending: true });

  if (teamsError) {
    throw new Error(`Failed to fetch teams: ${teamsError.message}`);
  }

  if (!teams || teams.length === 0) {
    return { teams: [] };
  }

  const teamIds = teams.map(t => t.id);

  // Get all weeks for the season to find the latest one for current value
  const { data: weeks, error: weeksError } = await uow.getClient()
    .from('weeks')
    .select('id, week_number')
    .eq('season_id', seasonId)
    .order('week_number', { ascending: false });

  if (weeksError) {
    throw new Error(`Failed to fetch weeks: ${weeksError.message}`);
  }

  const weekIds = weeks?.map(w => w.id) || [];

  // Get all scores for these teams
  const { data: scores, error: scoresError } = await uow.getClient()
    .from('fantasy_team_scores')
    .select('fantasy_team_id, week_id, total_points')
    .in('fantasy_team_id', teamIds)
    .in('week_id', weekIds);

  if (scoresError) {
    throw new Error(`Failed to fetch scores: ${scoresError.message}`);
  }

  // Get latest snapshots for current value (most recent week with a snapshot)
  const { data: snapshots, error: snapshotsError } = await uow.getClient()
    .from('fantasy_team_snapshots')
    .select('fantasy_team_id, week_id, total_value')
    .in('fantasy_team_id', teamIds)
    .in('week_id', weekIds);

  if (snapshotsError) {
    throw new Error(`Failed to fetch snapshots: ${snapshotsError.message}`);
  }

  // Build total points per team
  const totalPointsMap = new Map<string, number>();
  scores?.forEach(s => {
    const current = totalPointsMap.get(s.fantasy_team_id) || 0;
    totalPointsMap.set(s.fantasy_team_id, current + (s.total_points || 0));
  });

  // Build current value map (use latest week's snapshot)
  // Create a map of teamId -> weekNumber -> value
  const weekNumberMap = new Map(weeks?.map(w => [w.id, w.week_number]) || []);
  const latestValueMap = new Map<string, { value: number; weekNumber: number }>();

  snapshots?.forEach(s => {
    const weekNumber = weekNumberMap.get(s.week_id) || 0;
    const existing = latestValueMap.get(s.fantasy_team_id);
    if (!existing || weekNumber > existing.weekNumber) {
      latestValueMap.set(s.fantasy_team_id, { value: s.total_value, weekNumber });
    }
  });

  // Build leaderboard teams
  const leaderboardTeams: Omit<LeaderboardTeam, 'rank'>[] = teams.map(team => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerProfile = (team as any).user_profiles as { display_name: string | null } | null;

    return {
      teamId: team.id,
      teamName: team.name,
      emoji: team.emoji || '🏆',
      ownerName: ownerProfile?.display_name || null,
      totalPoints: totalPointsMap.get(team.id) || 0,
      currentValue: latestValueMap.get(team.id)?.value ?? null,
    };
  });

  // Sort by total points descending and assign ranks
  leaderboardTeams.sort((a, b) => b.totalPoints - a.totalPoints);

  const rankedTeams: LeaderboardTeam[] = leaderboardTeams.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));

  return { teams: rankedTeams };
}
