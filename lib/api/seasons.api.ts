/**
 * Seasons API - Server Actions
 * Thin adapter layer between query hooks and domain services
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { SeasonsService } from '@/lib/domain/services';
import { InsertSeason, UpdateSeason, Season, SeasonPlayer, Week, InsertWeek, UpdateWeek } from '@/lib/domain/types';
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

// ============================================
// Week Management
// ============================================

export async function getWeeks(seasonId: string): Promise<Week[]> {
  const uow = await getUnitOfWork();
  return uow.weeks.findBySeason(seasonId);
}

export async function createWeek(data: InsertWeek): Promise<TestResult<Week>> {
  const uow = await getUnitOfWork();
  try {
    // Validate week_number is at least 1
    if (data.week_number < 1) {
      return { success: false, message: 'Week number must be at least 1', error: 'Invalid week number' };
    }

    // Check if week number already exists for this season
    const existing = await uow.weeks.findByWeekNumber(data.season_id, data.week_number);
    if (existing) {
      return { success: false, message: `Week ${data.week_number} already exists for this season`, error: 'Duplicate week number' };
    }

    // Set default cutoff time to 6pm on the game date if not provided
    const weekData: InsertWeek = { ...data };
    if (!weekData.transfer_cutoff_time && (weekData.start_date || weekData.end_date)) {
      const gameDate = weekData.start_date || weekData.end_date;
      if (gameDate) {
        // Parse the date and set to 6pm (18:00) local time
        const dateParts = gameDate.split('-');
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
        const day = parseInt(dateParts[2], 10);
        const cutoffDateTime = new Date(year, month, day, 18, 0, 0, 0);
        weekData.transfer_cutoff_time = cutoffDateTime.toISOString();
      }
    }

    const week = await uow.weeks.create(weekData);
    return { success: true, message: 'Week created successfully', data: week };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create week';
    return { success: false, message, error: message };
  }
}

export async function updateWeek(data: UpdateWeek): Promise<TestResult<Week>> {
  const uow = await getUnitOfWork();
  try {
    const existing = await uow.weeks.findById(data.id);
    if (!existing) {
      return { success: false, message: 'Week not found', error: 'Week not found' };
    }

    // If updating week_number, check for duplicates
    if (data.week_number !== undefined && data.week_number !== existing.week_number) {
      if (data.week_number < 1) {
        return { success: false, message: 'Week number must be at least 1', error: 'Invalid week number' };
      }

      const duplicate = await uow.weeks.findByWeekNumber(existing.season_id, data.week_number);
      if (duplicate && duplicate.id !== data.id) {
        return { success: false, message: `Week ${data.week_number} already exists for this season`, error: 'Duplicate week number' };
      }
    }

    const week = await uow.weeks.update(data);
    return { success: true, message: 'Week updated successfully', data: week };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update week';
    return { success: false, message, error: message };
  }
}

export async function deleteWeek(weekId: string): Promise<TestResult<null>> {
  const uow = await getUnitOfWork();
  try {
    // Check if week has games
    const games = await uow.games.findByWeek(weekId);
    if (games.length > 0) {
      return { success: false, message: 'Cannot delete week with games. Remove all games first.', error: 'Week has games' };
    }

    await uow.weeks.delete(weekId);
    return { success: true, message: 'Week deleted successfully', data: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete week';
    return { success: false, message, error: message };
  }
}

export async function createWeeks(data: {
  seasonId: string;
  startWeekNumber: number;
  count: number;
  firstGameDate: string; // Monday date
  namePattern?: string; // e.g., "Week {n} - Pool Play" or "Week {n}"
  isDraftWeek?: boolean;
}): Promise<TestResult<Week[]>> {
  const uow = await getUnitOfWork();
  try {
    // Validate inputs
    if (data.count < 1) {
      return { success: false, message: 'Count must be at least 1', error: 'Invalid count' };
    }

    if (data.startWeekNumber < 1) {
      return { success: false, message: 'Start week number must be at least 1', error: 'Invalid week number' };
    }

    // Check if any of the week numbers already exist
    const existingWeeks = await uow.weeks.findBySeason(data.seasonId);
    const existingWeekNumbers = new Set(existingWeeks.map(w => w.week_number));
    
    const weeksToCreate: InsertWeek[] = [];
    for (let i = 0; i < data.count; i++) {
      const weekNumber = data.startWeekNumber + i;
      
      if (existingWeekNumbers.has(weekNumber)) {
        return { success: false, message: `Week ${weekNumber} already exists`, error: 'Duplicate week number' };
      }

      // Calculate game date (Monday) for this week (7 days apart)
      const firstDate = new Date(data.firstGameDate);
      const gameDate = new Date(firstDate);
      gameDate.setDate(firstDate.getDate() + (i * 7));
      const gameDateStr = gameDate.toISOString().split('T')[0];

      // Generate name from pattern or default
      let weekName: string | undefined;
      if (data.namePattern) {
        weekName = data.namePattern.replace(/{n}/g, weekNumber.toString());
      }

      // Set default cutoff time to 6pm (18:00) on the game date
      const dateParts = gameDateStr.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
      const day = parseInt(dateParts[2], 10);
      const cutoffDateTime = new Date(year, month, day, 18, 0, 0, 0);

      weeksToCreate.push({
        season_id: data.seasonId,
        week_number: weekNumber,
        name: weekName,
        start_date: gameDateStr,
        end_date: gameDateStr, // Same as start since games are on Monday
        is_draft_week: data.isDraftWeek || false,
        transfer_cutoff_time: cutoffDateTime.toISOString(),
      });
    }

    const weeks = await uow.weeks.createMany(weeksToCreate);
    return { success: true, message: `Created ${weeks.length} weeks successfully`, data: weeks };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create weeks';
    return { success: false, message, error: message };
  }
}

