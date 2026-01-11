/**
 * Standings API - Server Actions
 * Calculates team standings from completed games
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { Game } from '@/lib/domain/types';

export interface TeamStanding {
  team_id: string;
  team_name: string;
  team_slug: string;
  team_color?: string;
  wins: number;
  losses: number;
  ties: number;
}

/**
 * Calculate team standings from completed games
 */
export async function getTeamStandings(): Promise<TeamStanding[]> {
  const uow = await getUnitOfWork();

  return uow.execute(async () => {
    // Get all completed games with scores
    const games = await uow.games.findAll({
      is_completed: true,
    } as Partial<Game>);

    // Filter games that have scores
    const gamesWithScores = games.filter(
      (game) => game.home_score !== undefined && game.away_score !== undefined
    );

    // Get all teams
    const teams = await uow.teams.findAll();

    // Initialize standings map
    const standingsMap = new Map<string, TeamStanding>();
    teams.forEach((team) => {
      standingsMap.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        team_slug: team.slug || '',
        team_color: team.color,
        wins: 0,
        losses: 0,
        ties: 0,
      });
    });

    // Calculate W/L/T from games
    gamesWithScores.forEach((game) => {
      const homeScore = game.home_score!;
      const awayScore = game.away_score!;

      const homeStanding = standingsMap.get(game.home_team_id);
      const awayStanding = standingsMap.get(game.away_team_id);

      if (homeStanding && awayStanding) {
        if (homeScore > awayScore) {
          homeStanding.wins++;
          awayStanding.losses++;
        } else if (awayScore > homeScore) {
          awayStanding.wins++;
          homeStanding.losses++;
        } else {
          homeStanding.ties++;
          awayStanding.ties++;
        }
      }
    });

    // Convert to array and sort by wins (descending), then by losses (ascending), then by ties (descending)
    const standings = Array.from(standingsMap.values()).sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      if (a.losses !== b.losses) {
        return a.losses - b.losses;
      }
      return b.ties - a.ties;
    });

    return standings;
  });
}

