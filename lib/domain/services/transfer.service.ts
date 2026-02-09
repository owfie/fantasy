/**
 * Transfer Service
 * Handles transfer window validation and state management
 *
 * Note: Transfers are now computed from snapshot diffs, not stored in the transfers table.
 * The actual transfer validation (count limits, budget) happens at snapshot save time
 * in FantasyTeamSnapshotService.
 *
 * Transfer Window States (derived from prices_calculated, transfer_window_open, cutoff_time, closed_at):
 * - upcoming: prices_calculated=false, transfer_window_open=false -> No prices yet
 * - ready: prices_calculated=true, transfer_window_open=false, closed_at=null -> For admin review
 * - open: prices_calculated=true, transfer_window_open=true, cutoff not passed -> Users can transfer
 * - completed: Either manually closed (closed_at set) OR cutoff time has passed
 * - Invalid: prices_calculated=false, transfer_window_open=true (prevented by service)
 */

import { UnitOfWork } from '../unit-of-work';
import { canBypassTransferWindow } from '@/lib/config/transfer-whitelist';
import { computeTransfersFromIds } from '@/lib/utils/transfer-computation';
import { MAX_TRANSFERS_PER_WEEK } from './budget.service';
import { getTransferWindowState, TransferWindowState } from '../types';

export interface OpenWindowResult {
  success: boolean;
  error?: string;
}

export interface CloseWindowResult {
  success: boolean;
  error?: string;
}

export class TransferService {
  constructor(private uow: UnitOfWork) {}

  /**
   * Check if transfers can be made for a week
   * - Transfer window must be open
   * - Must be before cutoff time (if set)
   * - Users on whitelist can bypass these restrictions
   */
  async canMakeTransfer(
    weekId: string,
    userId?: string
  ): Promise<{ canTransfer: boolean; reason?: string }> {
    // Check if user can bypass transfer window restrictions
    if (canBypassTransferWindow(userId)) {
      return { canTransfer: true };
    }

    const week = await this.uow.weeks.findById(weekId);
    if (!week) {
      return { canTransfer: false, reason: 'Week not found' };
    }

    // Check if transfer window is open
    if (!week.transfer_window_open) {
      return { canTransfer: false, reason: 'Transfer window is closed for this week' };
    }

    // Check if past cutoff time
    if (week.transfer_cutoff_time) {
      const now = new Date();
      const cutoff = new Date(week.transfer_cutoff_time);
      if (now >= cutoff) {
        return { canTransfer: false, reason: 'Transfer cutoff time has passed' };
      }
    }

    return { canTransfer: true };
  }

  /**
   * Check if this is the team's first week (no previous snapshots exist)
   */
  async isFirstWeek(fantasyTeamId: string, weekId: string): Promise<boolean> {
    // Get all snapshots for this team, excluding the current week
    const allSnapshots = await this.uow.fantasyTeamSnapshots.findByFantasyTeam(fantasyTeamId);
    // If there are no snapshots, or the only snapshot is for the current week, it's the first week
    const otherWeekSnapshots = allSnapshots.filter(s => s.week_id !== weekId);
    return otherWeekSnapshots.length === 0;
  }

  /**
   * Get remaining transfers for a week
   * Computed by comparing current week snapshot to previous week snapshot
   *
   * @param fantasyTeamId - Fantasy team ID
   * @param weekId - Current week ID
   * @returns Remaining transfer count (or Infinity for first week)
   */
  async getRemainingTransfers(fantasyTeamId: string, weekId: string): Promise<number> {
    const isFirst = await this.isFirstWeek(fantasyTeamId, weekId);
    if (isFirst) {
      return Infinity; // First week has unlimited transfers (building initial roster)
    }

    // Get the fantasy team's season to find weeks
    const fantasyTeam = await this.uow.fantasyTeams.findById(fantasyTeamId);
    if (!fantasyTeam) {
      return 0;
    }

    // Get all weeks to find previous week
    const allWeeks = await this.uow.weeks.findBySeason(fantasyTeam.season_id);
    const sortedWeeks = allWeeks.sort((a, b) => a.week_number - b.week_number);
    const currentWeekIndex = sortedWeeks.findIndex(w => w.id === weekId);

    if (currentWeekIndex <= 0) {
      return MAX_TRANSFERS_PER_WEEK; // Can't determine previous week, assume max allowed
    }

    const previousWeek = sortedWeeks[currentWeekIndex - 1];

    // Get current and previous week snapshots
    const currentSnapshot = await this.uow.fantasyTeamSnapshots.findByFantasyTeamAndWeek(
      fantasyTeamId,
      weekId
    );
    const previousSnapshot = await this.uow.fantasyTeamSnapshots.findByFantasyTeamAndWeek(
      fantasyTeamId,
      previousWeek.id
    );

    if (!previousSnapshot) {
      return MAX_TRANSFERS_PER_WEEK; // No previous snapshot, assume max allowed
    }

    // Get player IDs from snapshots
    let currentPlayerIds: string[];
    if (currentSnapshot) {
      const snapshotPlayers = await this.uow.fantasyTeamSnapshotPlayers.findBySnapshot(currentSnapshot.id);
      currentPlayerIds = snapshotPlayers.map(p => p.player_id);
    } else {
      const teamPlayers = await this.uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
      currentPlayerIds = teamPlayers.map(p => p.player_id);
    }

    const previousPlayers = await this.uow.fantasyTeamSnapshotPlayers.findBySnapshot(
      previousSnapshot.id
    );
    const previousPlayerIds = previousPlayers.map(p => p.player_id);

    // Compute transfers from snapshot diff (count only - validation is done at save time)
    const transfers = computeTransfersFromIds(currentPlayerIds, previousPlayerIds);

    return Math.max(0, MAX_TRANSFERS_PER_WEEK - transfers.length);
  }

  /**
   * Get the current state of a transfer window
   */
  getWindowState(
    pricesCalculated: boolean,
    transferWindowOpen: boolean,
    cutoffTime?: string,
    closedAt?: string,
    weekEndDate?: string
  ): TransferWindowState {
    return getTransferWindowState(pricesCalculated, transferWindowOpen, cutoffTime, closedAt, weekEndDate);
  }

  /**
   * Open a transfer window for a week
   * Validates:
   * - For week 1: No prior prices needed (initial team selection)
   * - For week n (n > 1): Week n-1 prices must be calculated
   * - No other window can be currently open for the season
   */
  async openTransferWindow(weekId: string): Promise<OpenWindowResult> {
    const week = await this.uow.weeks.findById(weekId);
    if (!week) {
      return { success: false, error: 'Week not found' };
    }

    // Validation 1: Check previous week's prices (not current week)
    // TW_0 (before Week 1) -> no stats needed
    // TW_n (before Week n+1) -> needs Week n stats/prices
    if (week.week_number > 1) {
      const prevWeek = await this.uow.weeks.findBySeasonAndWeekNumber(week.season_id, week.week_number - 1);
      if (!prevWeek?.prices_calculated) {
        return { success: false, error: `Week ${week.week_number - 1} prices not yet calculated. Enter stats first.` };
      }
    }

    // Validation 2: No other window already open (service-level check before DB constraint)
    const openWindows = await this.uow.weeks.findOpenWindowsForSeason(week.season_id);
    if (openWindows.length > 0 && openWindows[0].id !== weekId) {
      return {
        success: false,
        error: `TW ${openWindows[0].week_number} is already open. Close it first.`,
      };
    }

    // Already open - no-op success
    if (week.transfer_window_open) {
      return { success: true };
    }

    // Open the window and clear closed_at (allows reopening previously closed windows)
    await this.uow.weeks.update({
      id: weekId,
      transfer_window_open: true,
      transfer_window_closed_at: null,
    });
    return { success: true };
  }

  /**
   * Close a transfer window for a week
   * Records the closed_at timestamp to distinguish "completed" from "ready" state
   */
  async closeTransferWindow(weekId: string): Promise<CloseWindowResult> {
    const week = await this.uow.weeks.findById(weekId);
    if (!week) {
      return { success: false, error: 'Week not found' };
    }

    // Already closed - no-op success
    if (!week.transfer_window_open) {
      return { success: true };
    }

    // Close the window and record timestamp
    await this.uow.weeks.update({
      id: weekId,
      transfer_window_open: false,
      transfer_window_closed_at: new Date().toISOString(),
    });
    return { success: true };
  }

  /**
   * Check if any transfer window is currently open for a season
   */
  async hasOpenWindow(seasonId: string): Promise<{ hasOpen: boolean; openWeek?: { id: string; weekNumber: number } }> {
    const openWindows = await this.uow.weeks.findOpenWindowsForSeason(seasonId);
    if (openWindows.length > 0) {
      return {
        hasOpen: true,
        openWeek: { id: openWindows[0].id, weekNumber: openWindows[0].week_number },
      };
    }
    return { hasOpen: false };
  }
}
