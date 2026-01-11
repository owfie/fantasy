/**
 * Utility functions for fantasy transfer operations
 */

export interface UnsavedTransfer {
  playerInId: string;
  playerOutId: string;
  id: string;
}

/**
 * Calculate if transfer limit has been reached
 * In first week, swaps are allowed freely (return false/not blocked)
 * After first week, block if total transfers >= 2 or remaining transfers <= 0
 */
export function calculateTransferLimitStatus(
  remainingTransfers: number | null | undefined,
  transfersUsed: number,
  unsavedTransfersCount: number,
  isFirstWeek?: boolean
): boolean {
  // First week allows free swaps - never block
  if (isFirstWeek) {
    return false;
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

