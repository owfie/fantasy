/**
 * Transfer Computation Unit Tests
 * Tests the snapshot diff-based transfer computation logic
 *
 * Key requirement: Transfers must be paired by position.
 * A handler can only be transferred for another handler, etc.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTransfersFromSnapshots,
  computeTransfersFromDraft,
  computeTransfersFromIds,
  isWithinTransferLimit,
  PlayerWithPosition,
} from '@/lib/utils/transfer-computation';

// Helper to create players with positions
function makePlayer(id: string, position: 'handler' | 'cutter' | 'receiver'): PlayerWithPosition {
  return { playerId: id, position };
}

describe('Transfer Computation', () => {
  describe('computeTransfersFromSnapshots (with positions)', () => {
    it('returns empty array when no changes', () => {
      const current = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
        makePlayer('r1', 'receiver'),
      ];
      const previous = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
        makePlayer('r1', 'receiver'),
      ];

      const transfers = computeTransfersFromSnapshots(current, previous);

      expect(transfers).toHaveLength(0);
    });

    it('detects single player swap within same position', () => {
      const current = [
        makePlayer('h1', 'handler'),
        makePlayer('h2', 'handler'),
        makePlayer('NEW-H', 'handler'), // New handler
        makePlayer('c1', 'cutter'),
      ];
      const previous = [
        makePlayer('h1', 'handler'),
        makePlayer('h2', 'handler'),
        makePlayer('h3', 'handler'), // Old handler
        makePlayer('c1', 'cutter'),
      ];

      const transfers = computeTransfersFromSnapshots(current, previous);

      expect(transfers).toHaveLength(1);
      expect(transfers[0].playerInId).toBe('NEW-H');
      expect(transfers[0].playerOutId).toBe('h3');
      expect(transfers[0].position).toBe('handler');
    });

    it('pairs transfers correctly by position', () => {
      // Swap 1 handler and 1 receiver
      const current = [
        makePlayer('NEW-H', 'handler'), // New handler
        makePlayer('c1', 'cutter'),
        makePlayer('NEW-R', 'receiver'), // New receiver
      ];
      const previous = [
        makePlayer('h1', 'handler'), // Old handler
        makePlayer('c1', 'cutter'),
        makePlayer('r1', 'receiver'), // Old receiver
      ];

      const transfers = computeTransfersFromSnapshots(current, previous);

      expect(transfers).toHaveLength(2);

      // Find handler transfer
      const handlerTransfer = transfers.find(t => t.position === 'handler');
      expect(handlerTransfer).toBeDefined();
      expect(handlerTransfer!.playerInId).toBe('NEW-H');
      expect(handlerTransfer!.playerOutId).toBe('h1');

      // Find receiver transfer
      const receiverTransfer = transfers.find(t => t.position === 'receiver');
      expect(receiverTransfer).toBeDefined();
      expect(receiverTransfer!.playerInId).toBe('NEW-R');
      expect(receiverTransfer!.playerOutId).toBe('r1');
    });

    it('handles multiple swaps within same position', () => {
      const current = [
        makePlayer('NEW-H1', 'handler'),
        makePlayer('NEW-H2', 'handler'),
        makePlayer('c1', 'cutter'),
      ];
      const previous = [
        makePlayer('h1', 'handler'),
        makePlayer('h2', 'handler'),
        makePlayer('c1', 'cutter'),
      ];

      const transfers = computeTransfersFromSnapshots(current, previous);

      expect(transfers).toHaveLength(2);
      expect(transfers.every(t => t.position === 'handler')).toBe(true);
    });

    it('handles order-independent comparison', () => {
      // Same players, different order should yield no transfers
      const current = [
        makePlayer('r1', 'receiver'),
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
      ];
      const previous = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
        makePlayer('r1', 'receiver'),
      ];

      const transfers = computeTransfersFromSnapshots(current, previous);

      expect(transfers).toHaveLength(0);
    });

    it('handles empty previous roster (first week)', () => {
      const current = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
        makePlayer('r1', 'receiver'),
      ];
      const previous: PlayerWithPosition[] = [];

      const transfers = computeTransfersFromSnapshots(current, previous);

      // All players are "in", no players "out"
      expect(transfers).toHaveLength(3);
      expect(transfers.every(t => t.playerOutId === '')).toBe(true);
    });
  });

  describe('computeTransfersFromDraft', () => {
    it('mirrors computeTransfersFromSnapshots behavior', () => {
      const draft = [
        makePlayer('h1', 'handler'),
        makePlayer('NEW-C', 'cutter'),
      ];
      const baseline = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
      ];

      const transfers = computeTransfersFromDraft(draft, baseline);

      expect(transfers).toHaveLength(1);
      expect(transfers[0].playerInId).toBe('NEW-C');
      expect(transfers[0].playerOutId).toBe('c1');
      expect(transfers[0].position).toBe('cutter');
    });
  });

  describe('computeTransfersFromIds (legacy)', () => {
    it('counts transfers without position matching', () => {
      const current = ['player-1', 'player-2', 'player-NEW'];
      const previous = ['player-1', 'player-2', 'player-3'];

      const transfers = computeTransfersFromIds(current, previous);

      expect(transfers).toHaveLength(1);
      expect(transfers[0].playerInId).toBe('player-NEW');
      expect(transfers[0].playerOutId).toBe('player-3');
    });
  });

  describe('isWithinTransferLimit', () => {
    it('returns true for first week regardless of count', () => {
      expect(isWithinTransferLimit(0, true)).toBe(true);
      expect(isWithinTransferLimit(5, true)).toBe(true);
      expect(isWithinTransferLimit(10, true)).toBe(true);
      expect(isWithinTransferLimit(100, true)).toBe(true);
    });

    it('returns true when within limit for non-first week', () => {
      expect(isWithinTransferLimit(0, false)).toBe(true);
      expect(isWithinTransferLimit(1, false)).toBe(true);
      expect(isWithinTransferLimit(2, false)).toBe(true);
    });

    it('returns false when over limit for non-first week', () => {
      expect(isWithinTransferLimit(3, false)).toBe(false);
      expect(isWithinTransferLimit(5, false)).toBe(false);
      expect(isWithinTransferLimit(10, false)).toBe(false);
    });

    it('respects custom max transfers', () => {
      expect(isWithinTransferLimit(3, false, 3)).toBe(true);
      expect(isWithinTransferLimit(4, false, 3)).toBe(false);
      expect(isWithinTransferLimit(5, false, 5)).toBe(true);
      expect(isWithinTransferLimit(6, false, 5)).toBe(false);
    });
  });

  describe('Transfer Chain Simplification', () => {
    // The key requirement: X→Y→Z in same session = 1 transfer (X→Z)
    // This is automatically handled by snapshot diff comparison

    it('X→Y→Z chain counts as 1 transfer when comparing to baseline', () => {
      // Baseline has handler X
      // User swaps X→Y, then Y→Z
      // Final roster has handler Z
      // Diff only sees X→Z (1 transfer)
      const baseline = [
        makePlayer('handler-X', 'handler'),
        makePlayer('c1', 'cutter'),
      ];
      const draft = [
        makePlayer('handler-Z', 'handler'),
        makePlayer('c1', 'cutter'),
      ];

      const transfers = computeTransfersFromSnapshots(draft, baseline);

      expect(transfers).toHaveLength(1);
      expect(transfers[0].playerInId).toBe('handler-Z');
      expect(transfers[0].playerOutId).toBe('handler-X');
      expect(transfers[0].position).toBe('handler');
    });

    it('X→Y then Y→X (revert) counts as 0 transfers', () => {
      const baseline = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
      ];
      const draft = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
      ];

      const transfers = computeTransfersFromSnapshots(draft, baseline);

      expect(transfers).toHaveLength(0);
    });

    it('multiple independent swaps still count correctly', () => {
      // Swap 1 handler and 1 cutter (2 independent transfers)
      const baseline = [
        makePlayer('h1', 'handler'),
        makePlayer('c1', 'cutter'),
        makePlayer('r1', 'receiver'),
      ];
      const draft = [
        makePlayer('NEW-H', 'handler'),
        makePlayer('NEW-C', 'cutter'),
        makePlayer('r1', 'receiver'),
      ];

      const transfers = computeTransfersFromSnapshots(draft, baseline);

      expect(transfers).toHaveLength(2);
      expect(transfers.map(t => t.position).sort()).toEqual(['cutter', 'handler']);
    });
  });

  describe('Position-based pairing prevents cross-position errors', () => {
    it('correctly pairs when handler and receiver are both changed', () => {
      // This was the bug: without position pairing, transfers could be mismatched
      const baseline = [
        makePlayer('h1', 'handler'),
        makePlayer('h2', 'handler'),
        makePlayer('r1', 'receiver'),
        makePlayer('r2', 'receiver'),
      ];
      const draft = [
        makePlayer('h1', 'handler'),
        makePlayer('NEW-H', 'handler'), // New handler replaces h2
        makePlayer('r1', 'receiver'),
        makePlayer('NEW-R', 'receiver'), // New receiver replaces r2
      ];

      const transfers = computeTransfersFromSnapshots(draft, baseline);

      expect(transfers).toHaveLength(2);

      // Handler transfer should pair NEW-H with h2
      const handlerTransfer = transfers.find(t => t.position === 'handler');
      expect(handlerTransfer!.playerInId).toBe('NEW-H');
      expect(handlerTransfer!.playerOutId).toBe('h2');

      // Receiver transfer should pair NEW-R with r2
      const receiverTransfer = transfers.find(t => t.position === 'receiver');
      expect(receiverTransfer!.playerInId).toBe('NEW-R');
      expect(receiverTransfer!.playerOutId).toBe('r2');
    });
  });
});
