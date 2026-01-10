/**
 * Fixtures API - Server Actions
 * Thin adapter layer between query hooks and domain repositories
 */

'use server';

import { revalidatePath } from 'next/cache';
import { getUnitOfWork } from '@/lib/domain/server-uow';
import { GamesRepository, GameWithTeams, GameWithDetails } from '@/lib/domain/repositories/games.repository';
import { UpdateGame, InsertGame, Game } from '@/lib/domain/types';

export async function getFixtures(): Promise<GameWithTeams[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.games.findAllWithTeams();
  });
}

export async function getFixture(id: string): Promise<GameWithDetails | null> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.games.findByIdWithDetails(id);
  });
}

export async function updateFixture(data: UpdateGame): Promise<GameWithTeams> {
  const uow = await getUnitOfWork();
  const result = await uow.execute(async () => {
    const updated = await uow.games.update(data);
    
    // Use the optimized method to fetch just this game with teams
    const gameWithTeams = await uow.games.findByIdWithTeams(updated.id);
    if (!gameWithTeams) {
      throw new Error('Failed to fetch updated fixture with teams');
    }
    
    return gameWithTeams;
  });

  // Revalidate the specific fixture page and the fixtures list page
  // This triggers on-demand ISR - the page will be regenerated on next request
  revalidatePath(`/fixtures/${data.id}`);
  revalidatePath('/fixtures');

  return result;
}

// ============================================
// Game CRUD Operations
// ============================================

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export async function getGamesByWeek(weekId: string): Promise<Game[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.games.findByWeek(weekId);
  });
}

export async function createGame(data: InsertGame): Promise<TestResult<Game>> {
  const uow = await getUnitOfWork();
  try {
    // Validate teams are different
    if (data.home_team_id === data.away_team_id) {
      return { success: false, message: 'Home and away teams must be different', error: 'Invalid teams' };
    }

    const game = await uow.games.create(data);
    
    // Set default availability for all active season players
    const { setDefaultAvailabilityForGame } = await import('./availability.api');
    await setDefaultAvailabilityForGame(game.id);
    
    return { success: true, message: 'Game created successfully', data: game };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create game';
    return { success: false, message, error: message };
  }
}

export async function updateGame(data: UpdateGame): Promise<TestResult<Game>> {
  const uow = await getUnitOfWork();
  try {
    const existing = await uow.games.findById(data.id);
    if (!existing) {
      return { success: false, message: 'Game not found', error: 'Game not found' };
    }

    // Validate teams are different if both are being updated
    const homeTeamId = data.home_team_id ?? existing.home_team_id;
    const awayTeamId = data.away_team_id ?? existing.away_team_id;
    if (homeTeamId === awayTeamId) {
      return { success: false, message: 'Home and away teams must be different', error: 'Invalid teams' };
    }

    const game = await uow.games.update(data);
    return { success: true, message: 'Game updated successfully', data: game };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update game';
    return { success: false, message, error: message };
  }
}

export async function deleteGame(gameId: string): Promise<TestResult<null>> {
  const uow = await getUnitOfWork();
  try {
    // Check if game has player stats
    const stats = await uow.playerStats.findByGame(gameId);
    if (stats.length > 0) {
      return { success: false, message: 'Cannot delete game with player stats. Remove all stats first.', error: 'Game has stats' };
    }

    await uow.games.delete(gameId);
    return { success: true, message: 'Game deleted successfully', data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete game';
    return { success: false, message, error: message };
  }
}

