/**
 * Players API - Server Actions
 * Thin adapter layer between query hooks and domain repositories
 */

'use server';

import { cache } from 'react';
import { getUnitOfWork } from '@/lib/domain/server-uow';
import { PlayerWithPrices } from '@/lib/domain/repositories/value-changes.repository';
import { Player } from '@/lib/domain/types';

/**
 * Get current player prices with previous week comparison
 * Returns only players active in the current season with their current value and change from previous round
 */
export async function getPlayerPrices(): Promise<PlayerWithPrices[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    // Get the active season to filter players
    const activeSeason = await uow.seasons.findActive();
    const seasonId = activeSeason?.id;
    
    return await uow.valueChanges.getCurrentPlayerPrices(seasonId);
  });
}

/**
 * Get player prices for a specific round
 */
export async function getPlayerPricesForRound(round: number): Promise<PlayerWithPrices[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.valueChanges.getPlayerPricesForRound(round);
  });
}

/**
 * Get all players
 */
export async function getPlayers(): Promise<Player[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.players.findAll();
  });
}

/**
 * Get a player by ID
 */
export async function getPlayer(id: string): Promise<Player | null> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.players.findById(id);
  });
}

/**
 * Get a player by slug (generated from first_name + last_name)
 */
export async function getPlayerBySlug(slug: string): Promise<Player | null> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const { generateSlug } = await import('@/lib/utils/slug');
    const allPlayers = await uow.players.findAll({ is_active: true });
    
    // Find player whose name matches the slug
    for (const player of allPlayers) {
      const playerSlug = generateSlug(`${player.first_name} ${player.last_name}`);
      if (playerSlug === slug) {
        return player;
      }
    }
    
    return null;
  });
}

/**
 * Player with value and team information for team selection UI
 */
export interface PlayerWithValue extends Player {
  currentValue: number;
  teamName?: string;
  teamSlug?: string;
  teamColor?: string;
  points?: number; // Total fantasy points (if available)
}

/**
 * Player details with full info for the player detail page/modal
 */
export interface PlayerDetails {
  player: Player;
  currentValue: number;
  startingValue: number;
  teamName?: string;
  teamColor?: string;
  weeklyAvailability: {
    weekNumber: number;
    weekName: string;
    status: 'available' | 'unavailable' | 'unsure' | null;
  }[];
}

/**
 * Get detailed player info by slug including current value and availability
 * Wrapped with React cache() to deduplicate calls within the same request
 * (e.g., generateMetadata and page component both calling this)
 */
export const getPlayerDetailsBySlug = cache(async (slug: string): Promise<PlayerDetails | null> => {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const { generateSlug } = await import('@/lib/utils/slug');

    // Find the player
    const allPlayers = await uow.players.findAll({ is_active: true });
    let player: Player | null = null;

    for (const p of allPlayers) {
      const playerSlug = generateSlug(`${p.first_name} ${p.last_name}`);
      if (playerSlug === slug) {
        player = p;
        break;
      }
    }

    if (!player) {
      return null;
    }

    // Get active season
    const activeSeason = await uow.seasons.findActive();
    if (!activeSeason) {
      return {
        player,
        currentValue: player.starting_value || 0,
        startingValue: player.starting_value || 0,
        weeklyAvailability: [],
      };
    }

    // Get season player info for starting value and team
    const seasonPlayers = await uow.seasonPlayers.findBySeason(activeSeason.id);
    const seasonPlayer = seasonPlayers.find(sp => sp.player_id === player!.id);
    const startingValue = seasonPlayer?.starting_value || player.starting_value || 0;

    // Get team info
    const teamId = seasonPlayer?.team_id || player.team_id;
    let teamName: string | undefined;
    let teamColor: string | undefined;
    if (teamId) {
      const team = await uow.teams.findById(teamId);
      teamName = team?.name;
      teamColor = team?.color;
    }

    // Get current value from value_changes or fall back to starting value
    const latestValueChange = await uow.valueChanges.findLatestByPlayer(player.id);
    const currentValue = latestValueChange?.value || startingValue;

    // Get weeks for the season
    const weeks = await uow.weeks.findBySeason(activeSeason.id);
    const sortedWeeks = weeks.sort((a, b) => a.week_number - b.week_number);

    // Optimized: Use findByWeekIds instead of findAll + JS filter
    const weekIds = sortedWeeks.map(w => w.id);
    const seasonGames = await uow.games.findByWeekIds(weekIds);

    // Get player's availability records
    const playerAvailability = await uow.playerAvailability.findByPlayer(player.id);
    const availabilityByGame = new Map(playerAvailability.map(a => [a.game_id, a.status]));

    // Map games to weeks
    const gamesByWeek = new Map<string, string[]>();
    for (const game of seasonGames) {
      const existing = gamesByWeek.get(game.week_id) || [];
      existing.push(game.id);
      gamesByWeek.set(game.week_id, existing);
    }

    // Build weekly availability
    const weeklyAvailability = sortedWeeks.map(week => {
      const weekGameIds = gamesByWeek.get(week.id) || [];

      // Find the player's availability for any game in this week
      let status: 'available' | 'unavailable' | 'unsure' | null = null;
      for (const gameId of weekGameIds) {
        const avail = availabilityByGame.get(gameId);
        if (avail) {
          status = avail;
          break;
        }
      }

      return {
        weekNumber: week.week_number,
        weekName: week.name || `Week ${week.week_number}`,
        status,
      };
    });

    return {
      player,
      currentValue,
      startingValue,
      teamName,
      teamColor,
      weeklyAvailability,
    };
  });
});

/**
 * Get players with their current values for a specific week, optionally filtered by position
 */
export async function getPlayersForWeekWithValues(
  weekId: string,
  seasonId: string,
  position?: 'handler' | 'cutter' | 'receiver'
): Promise<PlayerWithValue[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const { ValueTrackingService } = await import('@/lib/domain/services/value-tracking.service');
    const valueTracking = new ValueTrackingService(uow);

    // Get the week to find week number
    const week = await uow.weeks.findById(weekId);
    if (!week) {
      throw new Error('Week not found');
    }

    // Get active players for this season from season_players
    const seasonPlayers = await uow.seasonPlayers.findActiveBySeason(seasonId);
    const seasonPlayerIds = seasonPlayers.map(sp => sp.player_id);
    
    if (seasonPlayerIds.length === 0) {
      return [];
    }

    // Batch fetch: Get all players that are active in this season (1 query instead of N)
    const allPlayersArray = await uow.players.findByIds(seasonPlayerIds);
    const activePlayers = allPlayersArray.filter(p => p.is_active);

    // Filter by position if specified
    let players: Player[];
    if (position) {
      players = activePlayers.filter(p => p.position === position);
    } else {
      players = activePlayers;
    }

    if (players.length === 0) {
      return [];
    }

    // Get player values for this week
    const playerIds = players.map(p => p.id);
    const playerValues = await valueTracking.getPlayerValuesForWeek(
      playerIds,
      week.week_number,
      seasonId
    );

    // Get teams for players from season_players (team_id can be different per season)
    // Create a map of player_id -> seasonPlayer for quick lookup
    const seasonPlayersMap = new Map(seasonPlayers.map(sp => [sp.player_id, sp]));

    // Batch fetch: Get unique team IDs from season_players (1 query instead of N)
    const seasonTeamIds = [...new Set(seasonPlayers.filter(sp => sp.team_id).map(sp => sp.team_id!))];
    const teams = seasonTeamIds.length > 0
      ? await uow.teams.findByIds(seasonTeamIds)
      : [];

    const teamsMap = new Map(teams.map(t => [t.id, t]));

    // Combine players with values and team info
    const playersWithValues: PlayerWithValue[] = players.map(player => {
      const value = playerValues.get(player.id) || player.starting_value || 0;
      const seasonPlayer = seasonPlayersMap.get(player.id);
      const teamId = seasonPlayer?.team_id || player.team_id;
      const team = teamId ? teamsMap.get(teamId) : null;

      return {
        ...player,
        currentValue: value,
        teamName: team?.name,
        teamSlug: team?.slug,
        teamColor: team?.color,
      };
    });

    // Sort by value (descending) and then by name
    playersWithValues.sort((a, b) => {
      if (b.currentValue !== a.currentValue) {
        return b.currentValue - a.currentValue;
      }
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });

    return playersWithValues;
  });
}

