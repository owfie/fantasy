/**
 * Transfer Computation Utilities
 * Computes transfers by comparing snapshots between weeks
 *
 * IMPORTANT: Transfers must be paired by position to avoid invalid states.
 * A handler can only be transferred for another handler, etc.
 */

import { FantasyPosition } from '@/lib/domain/types';

export interface ComputedTransfer {
  id: string;           // Generated ID for UI key
  playerInId: string;
  playerOutId: string;
  position: FantasyPosition; // Position of the transfer (both in/out must match)
}

export interface PlayerWithPosition {
  playerId: string;
  position: FantasyPosition;
}

/**
 * Compute transfers by comparing current week players to previous week players
 * Transfers are paired by position to ensure validity (handler for handler, etc.)
 *
 * @param currentPlayers - Players in the current week's snapshot/roster with positions
 * @param previousPlayers - Players in the previous week's snapshot with positions
 * @returns Array of computed transfers (player in/out pairs matched by position)
 */
export function computeTransfersFromSnapshots(
  currentPlayers: PlayerWithPosition[],
  previousPlayers: PlayerWithPosition[]
): ComputedTransfer[] {
  const currentIds = new Set(currentPlayers.map(p => p.playerId));
  const previousIds = new Set(previousPlayers.map(p => p.playerId));

  // Players that are new this week (transferred in) - grouped by position
  const playersInByPosition = new Map<FantasyPosition, PlayerWithPosition[]>();
  for (const player of currentPlayers) {
    if (!previousIds.has(player.playerId)) {
      const list = playersInByPosition.get(player.position) || [];
      list.push(player);
      playersInByPosition.set(player.position, list);
    }
  }

  // Players that were removed (transferred out) - grouped by position
  const playersOutByPosition = new Map<FantasyPosition, PlayerWithPosition[]>();
  for (const player of previousPlayers) {
    if (!currentIds.has(player.playerId)) {
      const list = playersOutByPosition.get(player.position) || [];
      list.push(player);
      playersOutByPosition.set(player.position, list);
    }
  }

  // Pair transfers within each position
  const transfers: ComputedTransfer[] = [];
  const positions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];

  for (const position of positions) {
    const playersIn = playersInByPosition.get(position) || [];
    const playersOut = playersOutByPosition.get(position) || [];

    // Pair them up - number of ins and outs should match for valid transfers
    const maxLength = Math.max(playersIn.length, playersOut.length);
    for (let i = 0; i < maxLength; i++) {
      const playerIn = playersIn[i];
      const playerOut = playersOut[i];

      transfers.push({
        id: `computed-${position}-${i}-${playerIn?.playerId || 'none'}-${playerOut?.playerId || 'none'}`,
        playerInId: playerIn?.playerId || '',
        playerOutId: playerOut?.playerId || '',
        position,
      });
    }
  }

  return transfers;
}

/**
 * Compute transfers from draft roster changes
 * Used during editing before save to show pending transfers
 * @param draftPlayers - Players in the current draft roster with positions
 * @param baselinePlayers - Players from the baseline (previous week or initial snapshot) with positions
 * @returns Array of computed transfers
 */
export function computeTransfersFromDraft(
  draftPlayers: PlayerWithPosition[],
  baselinePlayers: PlayerWithPosition[]
): ComputedTransfer[] {
  return computeTransfersFromSnapshots(draftPlayers, baselinePlayers);
}

/**
 * Check if a transfer count is within the allowed limit
 * @param transferCount - Number of transfers
 * @param isFirstWeek - Whether this is the first week (unlimited transfers)
 * @param maxTransfers - Maximum allowed transfers per week (default 2)
 */
export function isWithinTransferLimit(
  transferCount: number,
  isFirstWeek: boolean,
  maxTransfers: number = 2
): boolean {
  if (isFirstWeek) return true;
  return transferCount <= maxTransfers;
}

/**
 * Legacy helper for backward compatibility - converts player IDs to PlayerWithPosition
 * when position data isn't available. Only use when position matching isn't critical.
 * @deprecated Use computeTransfersFromSnapshots with position data instead
 */
export function computeTransfersFromIds(
  currentPlayerIds: string[],
  previousPlayerIds: string[]
): ComputedTransfer[] {
  // Without position info, we can only count transfers, not pair them correctly
  const playersIn = currentPlayerIds.filter(id => !previousPlayerIds.includes(id));
  const playersOut = previousPlayerIds.filter(id => !currentPlayerIds.includes(id));

  const transfers: ComputedTransfer[] = [];
  const maxLength = Math.max(playersIn.length, playersOut.length);

  for (let i = 0; i < maxLength; i++) {
    transfers.push({
      id: `computed-${i}-${playersIn[i] || 'none'}-${playersOut[i] || 'none'}`,
      playerInId: playersIn[i] || '',
      playerOutId: playersOut[i] || '',
      position: 'handler', // Default - not accurate without position data
    });
  }

  return transfers;
}

