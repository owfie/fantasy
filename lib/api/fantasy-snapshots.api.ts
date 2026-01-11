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

