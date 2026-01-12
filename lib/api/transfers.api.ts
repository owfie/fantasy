/**
 * Transfers API - Server Actions
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { TransferService } from '@/lib/domain/services/transfer.service';
import { createClient } from '@/lib/supabase/server';

/**
 * Get the current authenticated user's ID
 */
async function getCurrentUserId(): Promise<string | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

/**
 * Check if transfers can be made for a week
 */
export async function canMakeTransfer(
  fantasyTeamId: string,
  weekId: string
): Promise<{ canTransfer: boolean; reason?: string }> {
  const uow = await getUnitOfWork();
  const userId = await getCurrentUserId();
  return uow.execute(async () => {
    const service = new TransferService(uow);
    return service.canMakeTransfer(fantasyTeamId, weekId, userId);
  });
}

/**
 * Get remaining transfers for a week
 * Returns 0 for first week (no transfers allowed, only free roster selection),
 * otherwise returns remaining count (max 2 per week)
 */
export async function getRemainingTransfers(
  fantasyTeamId: string,
  weekId: string
): Promise<number> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new TransferService(uow);
    return service.getRemainingTransfers(fantasyTeamId, weekId);
  });
}

/**
 * Check if this is the team's first week (no previous snapshots)
 */
export async function isFirstWeek(
  fantasyTeamId: string,
  weekId: string
): Promise<boolean> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new TransferService(uow);
    return service.isFirstWeek(fantasyTeamId, weekId);
  });
}

/**
 * Execute a transfer
 */
export async function executeTransfer(
  fantasyTeamId: string,
  playerInId: string,
  playerOutId: string,
  weekId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const uow = await getUnitOfWork();
  const userId = await getCurrentUserId();
  try {
    const service = new TransferService(uow);
    await service.executeTransfer(fantasyTeamId, playerInId, playerOutId, weekId, userId);
    return { success: true, message: 'Transfer executed successfully' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Validate a transfer without executing it
 */
export async function validateTransfer(
  fantasyTeamId: string,
  playerInId: string,
  playerOutId: string,
  weekId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const uow = await getUnitOfWork();
  const userId = await getCurrentUserId();
  return uow.execute(async () => {
    const service = new TransferService(uow);
    return service.validateTransfer(fantasyTeamId, playerInId, playerOutId, weekId, userId);
  });
}

/**
 * Get all transfers for a week
 */
export async function getTransfersByWeek(weekId: string) {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return uow.transfers.findByWeek(weekId);
  });
}

/**
 * Get all transfers for a season (across all weeks)
 */
export async function getTransfersBySeason(seasonId: string) {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    // Get all weeks for the season
    const weeks = await uow.weeks.findBySeason(seasonId);
    const weekIds = weeks.map(w => w.id);
    
    if (weekIds.length === 0) {
      return [];
    }

    // Get transfers for all weeks
    const { data, error } = await uow.getClient()
      .from('transfers')
      .select('*')
      .in('week_id', weekIds)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get transfers: ${error.message}`);
    }

    return (data || []) as any[];
  });
}

