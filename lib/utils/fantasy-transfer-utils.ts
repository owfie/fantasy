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

/**
 * Saved transfer from the database
 */
export interface SavedTransfer {
  id: string;
  player_in_id: string;
  player_out_id: string;
}

/**
 * Result of transfer simplification including which saved transfers to delete
 */
export interface TransferSimplificationResult {
  unsavedTransfers: UnsavedTransfer[];
  savedTransferIdsToDelete: string[];
}

/**
 * Simplify transfers by collapsing chains, including both unsaved and saved transfers.
 * 
 * When a user transfers Y in for X (X → Y), then Z in for Y (Y → Z),
 * the net effect from the baseline team is just X → Z.
 * 
 * This function handles:
 * 1. Chains through unsaved transfers (as before)
 * 2. Chains through saved transfers (marks them for deletion and creates new unsaved)
 * 3. Reverting to original player (removes/marks for deletion with no replacement)
 * 
 * @param currentUnsavedTransfers - The current list of unsaved transfers
 * @param savedTransfers - The list of saved transfers for this week
 * @param currentTransfersToDelete - IDs of saved transfers already marked for deletion
 * @param newPlayerInId - The player being brought in
 * @param newPlayerOutId - The player being removed
 * @param baselinePlayerIds - Set of player IDs from the baseline team (before any transfers this week)
 * @returns The simplified result with unsaved transfers and saved transfer IDs to delete
 */
export function simplifyTransfersWithSaved(
  currentUnsavedTransfers: UnsavedTransfer[],
  savedTransfers: SavedTransfer[],
  currentTransfersToDelete: string[],
  newPlayerInId: string,
  newPlayerOutId: string,
  baselinePlayerIds: Set<string>
): TransferSimplificationResult {
  // Check if the player being transferred out was in the baseline team
  const wasBaselinePlayer = baselinePlayerIds.has(newPlayerOutId);

  if (wasBaselinePlayer) {
    // The outgoing player was in the baseline team - this is a new transfer
    return {
      unsavedTransfers: [...currentUnsavedTransfers, createUnsavedTransfer(newPlayerInId, newPlayerOutId)],
      savedTransferIdsToDelete: currentTransfersToDelete,
    };
  }

  // The outgoing player was NOT in the baseline team - they were brought in via a transfer
  // First check unsaved transfers
  const unsavedTransferIndex = currentUnsavedTransfers.findIndex(t => t.playerInId === newPlayerOutId);

  if (unsavedTransferIndex !== -1) {
    // Found in unsaved transfers - handle the chain
    const existingTransfer = currentUnsavedTransfers[unsavedTransferIndex];
    const originalPlayerOut = existingTransfer.playerOutId;

    // Check if reverting to original player
    if (newPlayerInId === originalPlayerOut) {
      // Remove the transfer entirely - we're back to the baseline state for this slot
      return {
        unsavedTransfers: currentUnsavedTransfers.filter((_, idx) => idx !== unsavedTransferIndex),
        savedTransferIdsToDelete: currentTransfersToDelete,
      };
    }

    // Replace the existing unsaved transfer with a simplified one
    const newUnsavedTransfers = [...currentUnsavedTransfers];
    newUnsavedTransfers[unsavedTransferIndex] = createUnsavedTransfer(newPlayerInId, originalPlayerOut);
    return {
      unsavedTransfers: newUnsavedTransfers,
      savedTransferIdsToDelete: currentTransfersToDelete,
    };
  }

  // Check saved transfers (only those not already marked for deletion)
  const activeSavedTransfers = savedTransfers.filter(t => !currentTransfersToDelete.includes(t.id));
  const savedTransfer = activeSavedTransfers.find(t => t.player_in_id === newPlayerOutId);

  if (savedTransfer) {
    // Found in saved transfers - mark for deletion and create replacement
    const originalPlayerOut = savedTransfer.player_out_id;
    const newTransfersToDelete = [...currentTransfersToDelete, savedTransfer.id];

    // Check if reverting to original player
    if (newPlayerInId === originalPlayerOut) {
      // Just delete the saved transfer - no replacement needed
      return {
        unsavedTransfers: currentUnsavedTransfers,
        savedTransferIdsToDelete: newTransfersToDelete,
      };
    }

    // Create a new unsaved transfer to replace the saved one
    return {
      unsavedTransfers: [...currentUnsavedTransfers, createUnsavedTransfer(newPlayerInId, originalPlayerOut)],
      savedTransferIdsToDelete: newTransfersToDelete,
    };
  }

  // Edge case: player not in baseline and no transfer found (shouldn't happen in normal flow)
  // Just add the new transfer
  return {
    unsavedTransfers: [...currentUnsavedTransfers, createUnsavedTransfer(newPlayerInId, newPlayerOutId)],
    savedTransferIdsToDelete: currentTransfersToDelete,
  };
}

/**
 * @deprecated Use simplifyTransfersWithSaved instead for full functionality
 * 
 * Simplify transfers by collapsing chains (unsaved transfers only).
 * Kept for backward compatibility.
 */
export function simplifyTransfers(
  currentTransfers: UnsavedTransfer[],
  newPlayerInId: string,
  newPlayerOutId: string,
  originalPlayerIds: Set<string>
): UnsavedTransfer[] {
  const result = simplifyTransfersWithSaved(
    currentTransfers,
    [], // No saved transfers
    [], // No transfers to delete
    newPlayerInId,
    newPlayerOutId,
    originalPlayerIds
  );
  return result.unsavedTransfers;
}

