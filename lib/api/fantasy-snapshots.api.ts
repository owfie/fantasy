/**
 * Fantasy Snapshots API - Server Actions
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { FantasyTeamSnapshotService } from '@/lib/domain/services/fantasy-team-snapshot.service';
import { FantasyTeamSnapshot, FantasyTeamSnapshotPlayer, FantasyPosition } from '@/lib/domain/types';

export interface SnapshotWithPlayers {
  snapshot: FantasyTeamSnapshot;
  players: FantasyTeamSnapshotPlayer[];
}

/**
 * Get all snapshots for a fantasy team
 */
export async function getSnapshotsForTeam(fantasyTeamId: string): Promise<FantasyTeamSnapshot[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    return service.getSnapshotsForTeam(fantasyTeamId);
  });
}

/**
 * Get snapshot for a specific week
 */
export async function getSnapshotForWeek(
  fantasyTeamId: string,
  weekId: string
): Promise<FantasyTeamSnapshot | null> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    return service.getSnapshotForWeek(fantasyTeamId, weekId);
  });
}

/**
 * Get snapshot with players
 * Returns null if snapshot doesn't exist (for new teams without snapshots)
 */
export async function getSnapshotWithPlayers(snapshotId: string): Promise<SnapshotWithPlayers | null> {
  if (!snapshotId) {
    return null;
  }

  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    return service.getSnapshotWithPlayers(snapshotId);
  });
}

/**
 * Get snapshot with players for a specific week - SINGLE QUERY
 * Eliminates the waterfall of getSnapshotForWeek -> getSnapshotWithPlayers
 * Returns null if snapshot doesn't exist (for new teams without snapshots)
 */
export async function getSnapshotWithPlayersForWeek(
  fantasyTeamId: string,
  weekId: string
): Promise<SnapshotWithPlayers | null> {
  if (!fantasyTeamId || !weekId) {
    return null;
  }

  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    return service.getSnapshotWithPlayersForWeek(fantasyTeamId, weekId);
  });
}

/**
 * Create snapshot for a week
 * Returns SnapshotWithPlayers so we can cache it immediately without refetch
 */
export async function createSnapshot(
  fantasyTeamId: string,
  weekId: string,
  players: Array<{
    playerId: string;
    position: FantasyPosition;
    isBenched: boolean;
    isCaptain: boolean;
  }>,
  allowPartial: boolean = false
): Promise<SnapshotWithPlayers> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    
    // Check if snapshot already exists and delete it if so
    const existing = await service.getSnapshotForWeek(fantasyTeamId, weekId);
    if (existing) {
      // Delete existing snapshot players first (CASCADE should handle this, but be explicit)
      const existingPlayers = await uow.fantasyTeamSnapshotPlayers.findBySnapshot(existing.id);
      for (const player of existingPlayers) {
        await uow.fantasyTeamSnapshotPlayers.delete(player.id);
      }
      // Delete the snapshot itself
      await uow.fantasyTeamSnapshots.delete(existing.id);
    }
    
    const snapshot = await service.createSnapshotForWeek(fantasyTeamId, weekId, players, allowPartial);
    
    // Sync fantasy_team_players table to match the snapshot
    // This ensures the admin panel (which reads from fantasy_team_players) shows the current team state
    const existingTeamPlayers = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
    
    // Delete all existing players from fantasy_team_players
    for (const existingPlayer of existingTeamPlayers) {
      await uow.fantasyTeamPlayers.delete(existingPlayer.id);
    }
    
    // Insert new players from the snapshot into fantasy_team_players
    const teamPlayerInserts = players.map((player) => ({
      fantasy_team_id: fantasyTeamId,
      player_id: player.playerId,
      is_captain: player.isCaptain,
      is_reserve: player.isBenched, // Map is_benched to is_reserve
      is_active: true, // All players in snapshot are active
      draft_round: undefined,
      draft_pick: undefined,
    }));
    
    if (teamPlayerInserts.length > 0) {
      await uow.fantasyTeamPlayers.createMany(teamPlayerInserts);
    }
    
    // Get the snapshot with players immediately (no extra fetch needed - we just created it)
    const snapshotWithPlayers = await service.getSnapshotWithPlayers(snapshot.id);
    if (!snapshotWithPlayers) {
      throw new Error('Failed to retrieve created snapshot with players');
    }
    
    return snapshotWithPlayers;
  });
}

/**
 * Create snapshot from current team state
 */
export async function createSnapshotFromCurrentTeam(
  fantasyTeamId: string,
  weekId: string
): Promise<FantasyTeamSnapshot> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    return service.createSnapshotFromCurrentTeam(fantasyTeamId, weekId);
  });
}

