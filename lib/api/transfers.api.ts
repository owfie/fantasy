/**
 * Transfers API - Server Actions
 *
 * Note: Transfers are now computed from snapshot diffs, not stored in the transfers table.
 * The transfer table functions are kept for backward compatibility/audit purposes.
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
  weekId: string
): Promise<{ canTransfer: boolean; reason?: string }> {
  const uow = await getUnitOfWork();
  const userId = await getCurrentUserId();
  return uow.execute(async () => {
    const service = new TransferService(uow);
    return service.canMakeTransfer(weekId, userId);
  });
}

/**
 * Get remaining transfers for a week
 * Returns Infinity for first week (unlimited transfers for building initial roster),
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
 * Get all transfers for a week (from transfers table - audit purposes)
 * @deprecated Transfers are now computed from snapshot diffs
 */
export async function getTransfersByWeek(weekId: string) {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return uow.transfers.findByWeek(weekId);
  });
}

/**
 * Get all transfers for a season (from transfers table - audit purposes)
 * @deprecated Transfers are now computed from snapshot diffs
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
