/**
 * Fantasy Scores API - Server Actions
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { FantasyScoreService } from '@/lib/domain/services/fantasy-score.service';
import { InsertFantasyTeamScore } from '@/lib/domain/types';

/**
 * Calculate score for a week
 */
export async function calculateWeekScore(
  fantasyTeamId: string,
  weekId: string
): Promise<{
  totalPoints: number;
  captainPoints: number;
  substitutions: Array<{
    playerOut: string;
    playerIn: string;
    reason: string;
  }>;
}> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyScoreService(uow);
    return service.calculateWeekScore(fantasyTeamId, weekId);
  });
}

/**
 * Calculate and save score for a week
 */
export async function calculateAndSaveWeekScore(
  fantasyTeamId: string,
  weekId: string
): Promise<InsertFantasyTeamScore> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyScoreService(uow);
    return service.calculateAndSaveWeekScore(fantasyTeamId, weekId);
  });
}

/**
 * Recalculate all subsequent weeks from a given week
 */
export async function recalculateFromWeek(
  fantasyTeamId: string,
  fromWeekId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const uow = await getUnitOfWork();
  try {
    const service = new FantasyScoreService(uow);
    await service.recalculateAllSubsequentWeeks(fantasyTeamId, fromWeekId);
    return { success: true, message: 'Scores recalculated successfully' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

