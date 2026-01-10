/**
 * Transfer Service
 * Handles transfer validation, execution, and limits
 */

import { UnitOfWork } from '../unit-of-work';
import { InsertTransfer, FantasyPosition, Player } from '../types';
import { FantasyTeamSnapshotService } from './fantasy-team-snapshot.service';
import { ValueTrackingService } from './value-tracking.service';

const MAX_TRANSFERS_PER_WEEK = 2;
const SALARY_CAP = 450;

export interface TransferValidationResult {
  valid: boolean;
  errors: string[];
}

export class TransferService {
  private snapshotService: FantasyTeamSnapshotService;
  private valueTracking: ValueTrackingService;

  constructor(private uow: UnitOfWork) {
    this.snapshotService = new FantasyTeamSnapshotService(uow);
    this.valueTracking = new ValueTrackingService(uow);
  }

  /**
   * Check if transfers can be made for a week
   * - Transfer window must be open
   * - Must be before cutoff time (if set)
   */
  async canMakeTransfer(fantasyTeamId: string, weekId: string): Promise<{ canTransfer: boolean; reason?: string }> {
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
   * Get remaining transfers for a week
   */
  async getRemainingTransfers(fantasyTeamId: string, weekId: string): Promise<number> {
    const count = await this.uow.transfers.countByFantasyTeamAndWeek(fantasyTeamId, weekId);
    return Math.max(0, MAX_TRANSFERS_PER_WEEK - count);
  }

  /**
   * Validate a transfer
   */
  async validateTransfer(
    fantasyTeamId: string,
    playerInId: string,
    playerOutId: string,
    weekId: string
  ): Promise<TransferValidationResult> {
    const errors: string[] = [];

    // Check if can make transfer
    const canTransfer = await this.canMakeTransfer(fantasyTeamId, weekId);
    if (!canTransfer.canTransfer) {
      errors.push(canTransfer.reason || 'Cannot make transfer');
    }

    // Check transfer limit
    const remaining = await this.getRemainingTransfers(fantasyTeamId, weekId);
    if (remaining <= 0) {
      errors.push(`Maximum of ${MAX_TRANSFERS_PER_WEEK} transfers allowed per week`);
    }

    // Get fantasy team
    const fantasyTeam = await this.uow.fantasyTeams.findById(fantasyTeamId);
    if (!fantasyTeam) {
      errors.push('Fantasy team not found');
      return { valid: false, errors };
    }

    // Get week
    const week = await this.uow.weeks.findById(weekId);
    if (!week) {
      errors.push('Week not found');
      return { valid: false, errors };
    }

    // Get current snapshot or team players
    const currentSnapshot = await this.snapshotService.getSnapshotForWeek(fantasyTeamId, weekId);
    let currentPlayers: Array<{ playerId: string; position: FantasyPosition; isBenched: boolean }>;

    if (currentSnapshot) {
      // Use snapshot
      const snapshotPlayers = await this.uow.fantasyTeamSnapshotPlayers.findBySnapshot(currentSnapshot.id);
      currentPlayers = snapshotPlayers.map(sp => ({
        playerId: sp.player_id,
        position: sp.position,
        isBenched: sp.is_benched,
      }));
    } else {
      // Use current team players
      const teamPlayers = await this.uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
      const playerDetails = await Promise.all(
        teamPlayers.map(tp => this.uow.players.findById(tp.player_id))
      );

      currentPlayers = teamPlayers.map((tp, index) => {
        const player = playerDetails[index];
        if (!player || !player.position) {
          throw new Error(`Player ${tp.player_id} does not have a position set`);
        }
        return {
          playerId: tp.player_id,
          position: player.position,
          isBenched: tp.is_reserve || !tp.is_active,
        };
      });
    }

    // Check player out is on team
    const playerOut = currentPlayers.find(p => p.playerId === playerOutId);
    if (!playerOut) {
      errors.push('Player to remove is not on your team');
    }

    // Check player in is not already on team
    const playerInExists = currentPlayers.find(p => p.playerId === playerInId);
    if (playerInExists) {
      errors.push('Player to add is already on your team');
    }

    // Get player details
    const playerIn = await this.uow.players.findById(playerInId);
    const playerOutDetails = await this.uow.players.findById(playerOutId);

    if (!playerIn) {
      errors.push('Player to add not found');
    }
    if (!playerOutDetails) {
      errors.push('Player to remove not found');
    }

    if (playerIn && playerOutDetails && playerOut) {
      // Check position match (must replace with same position)
      if (playerIn.position !== playerOut.position) {
        errors.push(`Cannot replace ${playerOut.position} with ${playerIn.position}. Positions must match.`);
      }

      // Check salary cap
      const playerInValue = await this.valueTracking.getPlayerValueForWeek(
        playerInId,
        week.week_number,
        fantasyTeam.season_id
      );
      const playerOutValue = await this.valueTracking.getPlayerValueForWeek(
        playerOutId,
        week.week_number,
        fantasyTeam.season_id
      );

      // Calculate new total value
      const currentValue = currentSnapshot?.total_value || fantasyTeam.total_value;
      const newValue = currentValue - playerOutValue + playerInValue;

      if (newValue > SALARY_CAP) {
        errors.push(`Transfer would exceed salary cap. New total: ${newValue.toFixed(2)}, Cap: ${SALARY_CAP}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute a transfer
   * Creates a new snapshot with the transfer applied
   */
  async executeTransfer(
    fantasyTeamId: string,
    playerInId: string,
    playerOutId: string,
    weekId: string
  ): Promise<{ transfer: InsertTransfer; snapshot: any }> {
    return this.uow.execute(async (uow) => {
      // Validate transfer
      const validation = await this.validateTransfer(fantasyTeamId, playerInId, playerOutId, weekId);
      if (!validation.valid) {
        throw new Error(`Transfer validation failed: ${validation.errors.join(', ')}`);
      }

      // Get current snapshot or team players
      const week = await uow.weeks.findById(weekId);
      if (!week) {
        throw new Error('Week not found');
      }

      const fantasyTeam = await uow.fantasyTeams.findById(fantasyTeamId);
      if (!fantasyTeam) {
        throw new Error('Fantasy team not found');
      }

      const currentSnapshot = await this.snapshotService.getSnapshotForWeek(fantasyTeamId, weekId);
      let players: Array<{
        playerId: string;
        position: FantasyPosition;
        isBenched: boolean;
        isCaptain: boolean;
      }>;

      if (currentSnapshot) {
        // Use snapshot
        const snapshotPlayers = await uow.fantasyTeamSnapshotPlayers.findBySnapshot(currentSnapshot.id);
        players = snapshotPlayers.map(sp => ({
          playerId: sp.player_id,
          position: sp.position,
          isBenched: sp.is_benched,
          isCaptain: sp.is_captain,
        }));
      } else {
        // Use current team players
        const teamPlayers = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
        const playerDetails = await Promise.all(
          teamPlayers.map(tp => uow.players.findById(tp.player_id))
        );

        players = teamPlayers.map((tp, index) => {
          const player = playerDetails[index];
          if (!player || !player.position) {
            throw new Error(`Player ${tp.player_id} does not have a position set`);
          }
          return {
            playerId: tp.player_id,
            position: player.position,
            isBenched: tp.is_reserve || !tp.is_active,
            isCaptain: tp.is_captain,
          };
        });
      }

      // Apply transfer: replace playerOut with playerIn
      const playerOutIndex = players.findIndex(p => p.playerId === playerOutId);
      if (playerOutIndex === -1) {
        throw new Error('Player to remove not found in team');
      }

      const playerIn = await uow.players.findById(playerInId);
      if (!playerIn || !playerIn.position) {
        throw new Error('Player to add does not have a position set');
      }

      // Replace player, maintaining position and bench status
      const wasCaptain = players[playerOutIndex].isCaptain;
      players[playerOutIndex] = {
        playerId: playerInId,
        position: playerIn.position,
        isBenched: players[playerOutIndex].isBenched,
        isCaptain: wasCaptain, // Keep captain status if it was the captain
      };

      // Calculate transfer value
      const playerInValue = await this.valueTracking.getPlayerValueForWeek(
        playerInId,
        week.week_number,
        fantasyTeam.season_id
      );
      const playerOutValue = await this.valueTracking.getPlayerValueForWeek(
        playerOutId,
        week.week_number,
        fantasyTeam.season_id
      );
      const netTransferValue = playerInValue - playerOutValue;

      // Create or update snapshot with new lineup
      let snapshot;
      if (currentSnapshot) {
        // Delete old snapshot players and recreate
        const oldPlayers = await uow.fantasyTeamSnapshotPlayers.findBySnapshot(currentSnapshot.id);
        for (const oldPlayer of oldPlayers) {
          await uow.fantasyTeamSnapshotPlayers.delete(oldPlayer.id);
        }
        await uow.fantasyTeamSnapshots.delete(currentSnapshot.id);
      }

      // Create new snapshot
      snapshot = await this.snapshotService.createSnapshotForWeek(fantasyTeamId, weekId, players);

      // Create transfer record
      const transfer: InsertTransfer = {
        fantasy_team_id: fantasyTeamId,
        player_in_id: playerInId,
        player_out_id: playerOutId,
        week_id: weekId,
        round: week.week_number, // Keep for backward compatibility
        net_transfer_value: netTransferValue,
      };

      const createdTransfer = await uow.transfers.create(transfer);

      // Update current team value
      await this.valueTracking.updateTeamValue(fantasyTeamId);

      return { transfer: createdTransfer, snapshot };
    });
  }
}

