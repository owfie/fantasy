/**
 * Utility functions for fantasy transfer operations
 */

import { UNLIMITED_TRANSFERS } from '@/lib/queries/transfers.queries';

export interface UnsavedTransfer {
  playerInId: string;
  playerOutId: string;
  id: string;
}

/**
 * Calculate if transfer limit has been reached
 * First week has unlimited transfers (UNLIMITED_TRANSFERS = -1)
 * Block if total transfers >= 2 or remaining transfers <= 0
 */
export function calculateTransferLimitStatus(
  remainingTransfers: number | null | undefined,
  transfersUsed: number,
  unsavedTransfersCount: number
): boolean {
  if (remainingTransfers === UNLIMITED_TRANSFERS) {
    return false; // First week - unlimited transfers
  }
  
  const transfersRemaining = remainingTransfers ?? 0;
  const totalTransfers = transfersUsed + unsavedTransfersCount;
  
  return totalTransfers >= 2 || transfersRemaining <= 0;
}

/**
 * Create an unsaved transfer object
 */
export function createUnsavedTransfer(
  playerInId: string,
  playerOutId: string
): UnsavedTransfer {
  return {
    playerInId,
    playerOutId,
    id: `unsaved-${Date.now()}-${Math.random()}`,
  };
}

