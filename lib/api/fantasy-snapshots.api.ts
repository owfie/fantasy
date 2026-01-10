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
 */
export async function getSnapshotWithPlayers(snapshotId: string): Promise<SnapshotWithPlayers> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    return service.getSnapshotWithPlayers(snapshotId);
  });
}

/**
 * Create snapshot for a week
 */
export async function createSnapshot(
  fantasyTeamId: string,
  weekId: string,
  players: Array<{
    playerId: string;
    position: FantasyPosition;
    isBenched: boolean;
    isCaptain: boolean;
  }>
): Promise<FantasyTeamSnapshot> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    const service = new FantasyTeamSnapshotService(uow);
    return service.createSnapshotForWeek(fantasyTeamId, weekId, players);
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

