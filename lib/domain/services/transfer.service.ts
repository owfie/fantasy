/**
 * Transfer Service
 * Handles transfer window validation
 *
 * Note: Transfers are now computed from snapshot diffs, not stored in the transfers table.
 * The actual transfer validation (count limits, budget) happens at snapshot save time
 * in FantasyTeamSnapshotService.
 */

import { UnitOfWork } from '../unit-of-work';
import { canBypassTransferWindow } from '@/lib/config/transfer-whitelist';
import { computeTransfersFromIds } from '@/lib/utils/transfer-computation';
import { MAX_TRANSFERS_PER_WEEK } from './budget.service';

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
}
