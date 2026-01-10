/**
 * Players API - Server Actions
 * Thin adapter layer between query hooks and domain repositories
 */

'use server';

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

    // Get all players that are active in this season
    const allPlayers = await Promise.all(
      seasonPlayerIds.map(id => uow.players.findById(id))
    );
    const activePlayers = allPlayers.filter((p): p is Player => p !== null && p.is_active);

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
    
    // Get unique team IDs from season_players
    const seasonTeamIds = [...new Set(seasonPlayers.filter(sp => sp.team_id).map(sp => sp.team_id!))];
    const teams = seasonTeamIds.length > 0 
      ? await Promise.all(seasonTeamIds.map(id => uow.teams.findById(id)))
      : [];

    const teamsMap = new Map(teams.filter(Boolean).map(t => [t!.id, t!]));

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

