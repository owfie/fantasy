/**
 * Player Availability API - Server Actions
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { InsertPlayerAvailability, AvailabilityStatus } from '@/lib/domain/types';

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Update player availability for a game
 */
export async function updatePlayerAvailability(
  playerId: string,
  gameId: string,
  status: AvailabilityStatus
): Promise<TestResult> {
  const uow = await getUnitOfWork();
  
  return uow.execute(async () => {
    try {
      await uow.playerAvailability.upsert({
        player_id: playerId,
        game_id: gameId,
        status,
      });
      
      return { success: true, message: 'Availability updated successfully' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update availability';
      return { success: false, message, error: message };
    }
  });
}

/**
 * Set default availability (available) for all active season players when a game is created
 */
export async function setDefaultAvailabilityForGame(gameId: string): Promise<TestResult> {
  const uow = await getUnitOfWork();
  
  return uow.execute(async () => {
    try {
      // Get the game to find its week and season
      const game = await uow.games.findById(gameId);
      if (!game) {
        return { success: false, message: 'Game not found', error: 'Game not found' };
      }

      // Get the week to find the season
      const week = await uow.weeks.findById(game.week_id);
      if (!week) {
        return { success: false, message: 'Week not found', error: 'Week not found' };
      }

      // Get all active players in this season
      const seasonPlayers = await uow.seasonPlayers.findBySeason(week.season_id);
      const activePlayerIds = seasonPlayers
        .filter(sp => sp.is_active)
        .map(sp => sp.player_id);

      if (activePlayerIds.length === 0) {
        return { success: true, message: 'No active players in season' };
      }

      // Get players on the teams playing in this game
      const allPlayers = await uow.players.findAll();
      const gameTeamPlayers = allPlayers.filter(
        p => p.team_id === game.home_team_id || p.team_id === game.away_team_id
      );
      const gameTeamPlayerIds = new Set(gameTeamPlayers.map(p => p.id));

      // Filter to only players who are active in season AND on the teams playing
      const playersToSetAvailability = activePlayerIds.filter(
        playerId => gameTeamPlayerIds.has(playerId)
      );

      // Create availability records with default status 'available'
      const availabilities: InsertPlayerAvailability[] = playersToSetAvailability.map(playerId => ({
        player_id: playerId,
        game_id: gameId,
        status: 'available',
      }));

      // Upsert all availabilities (won't overwrite existing ones due to unique constraint)
      await uow.playerAvailability.upsertMany(availabilities);

      return { 
        success: true, 
        message: `Set default availability for ${availabilities.length} players` 
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set default availability';
      return { success: false, message, error: message };
    }
  });
}

/**
 * Get all availability for a season (for admin table)
 */
export async function getAvailabilityForSeason(seasonId: string): Promise<{
  playerId: string;
  gameId: string;
  status: AvailabilityStatus;
}[]> {
  const uow = await getUnitOfWork();
  
  return uow.execute(async () => {
    // Get all weeks for this season
    const weeks = await uow.weeks.findBySeason(seasonId);
    const weekIds = weeks.map(w => w.id);

    // Get all games for these weeks
    const allGames = await uow.games.findAll();
    const seasonGames = allGames.filter(g => weekIds.includes(g.week_id));
    const gameIds = seasonGames.map(g => g.id);

    if (gameIds.length === 0) {
      return [];
    }

    // Get all availability records for these games
    const allAvailability: Array<{ playerId: string; gameId: string; status: AvailabilityStatus }> = [];
    
    for (const gameId of gameIds) {
      const availability = await uow.playerAvailability.findByGame(gameId);
      allAvailability.push(...availability.map(av => ({
        playerId: av.player_id,
        gameId: av.game_id,
        status: av.status,
      })));
    }

    return allAvailability;
  });
}

