/**
 * Seasons API - Server Actions
 * Thin adapter layer between query hooks and domain services
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { SeasonsService } from '@/lib/domain/services';
import { InsertSeason, UpdateSeason, Season, SeasonPlayer } from '@/lib/domain/types';
import { SeasonPlayerWithPlayer } from '@/lib/domain/repositories';

// ============================================
// Season CRUD Operations
// ============================================

interface TestResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export async function getSeasons(): Promise<Season[]> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  return service.findAll();
}

export async function getSeason(id: string): Promise<Season | null> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  return service.findById(id);
}

export async function getActiveSeason(): Promise<Season | null> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  return service.findActive();
}

export async function createSeason(data: InsertSeason): Promise<TestResult<Season>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const season = await service.create(data);
    return { success: true, message: 'Season created successfully', data: season };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create season';
    return { success: false, message, error: message };
  }
}

export async function updateSeason(data: UpdateSeason): Promise<TestResult<Season>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const season = await service.update(data);
    return { success: true, message: 'Season updated successfully', data: season };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update season';
    return { success: false, message, error: message };
  }
}

export async function deleteSeason(seasonId: string): Promise<TestResult<null>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    await service.deleteHard(seasonId);
    return { success: true, message: 'Season deleted successfully', data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete season';
    return { success: false, message, error: message };
  }
}

export async function setSeasonActive(seasonId: string): Promise<TestResult<Season>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const season = await service.setActive(seasonId);
    return { success: true, message: 'Season set as active', data: season };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set season as active';
    return { success: false, message, error: message };
  }
}

// ============================================
// Season Player Management
// ============================================

export async function getSeasonPlayers(seasonId: string): Promise<SeasonPlayerWithPlayer[]> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  return service.getSeasonPlayers(seasonId);
}

export async function addPlayerToSeason(
  seasonId: string,
  playerId: string,
  startingValue: number
): Promise<TestResult<SeasonPlayer>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const seasonPlayer = await service.addPlayerToSeason(seasonId, playerId, startingValue);
    return { success: true, message: 'Player added to season', data: seasonPlayer };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add player to season';
    return { success: false, message, error: message };
  }
}

export async function addPlayersToSeason(
  seasonId: string,
  players: Array<{ playerId: string; startingValue: number; teamId?: string }>
): Promise<TestResult<SeasonPlayer[]>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const seasonPlayers = await service.addPlayersToSeason(seasonId, players);
    return { success: true, message: `Added ${seasonPlayers.length} players to season`, data: seasonPlayers };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add players to season';
    return { success: false, message, error: message };
  }
}

export async function removePlayerFromSeason(
  seasonId: string,
  playerId: string
): Promise<TestResult<null>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    await service.removePlayerFromSeason(seasonId, playerId);
    return { success: true, message: 'Player removed from season', data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove player from season';
    return { success: false, message, error: message };
  }
}

export async function updateSeasonPlayerValue(
  seasonId: string,
  playerId: string,
  startingValue: number
): Promise<TestResult<SeasonPlayer>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const seasonPlayer = await service.updatePlayerValue(seasonId, playerId, startingValue);
    return { success: true, message: 'Player value updated', data: seasonPlayer };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update player value';
    return { success: false, message, error: message };
  }
}

export async function setSeasonPlayerActive(
  seasonId: string,
  playerId: string,
  isActive: boolean
): Promise<TestResult<SeasonPlayer>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const seasonPlayer = await service.setPlayerActive(seasonId, playerId, isActive);
    return { success: true, message: isActive ? 'Player activated' : 'Player deactivated', data: seasonPlayer };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update player status';
    return { success: false, message, error: message };
  }
}

export async function copyPlayersFromSeason(
  fromSeasonId: string,
  toSeasonId: string,
  valueMultiplier: number = 1
): Promise<TestResult<SeasonPlayer[]>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const seasonPlayers = await service.copyPlayersFromSeason(fromSeasonId, toSeasonId, valueMultiplier);
    return { success: true, message: `Copied ${seasonPlayers.length} players to new season`, data: seasonPlayers };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to copy players';
    return { success: false, message, error: message };
  }
}

export async function updateSeasonPlayerTeam(
  seasonId: string,
  playerId: string,
  teamId: string | null
): Promise<TestResult<SeasonPlayer>> {
  const uow = await getUnitOfWork();
  const service = new SeasonsService(uow);
  try {
    const seasonPlayer = await service.updatePlayerTeam(seasonId, playerId, teamId);
    return { success: true, message: 'Player team updated', data: seasonPlayer };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update player team';
    return { success: false, message, error: message };
  }
}

