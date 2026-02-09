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
 * Get the most recent snapshot before a given week
 * This handles the case where a team skipped weeks (didn't save changes)
 * Returns null if no prior snapshot exists (truly first week)
 */
export async function getMostRecentSnapshotBeforeWeek(
  fantasyTeamId: string,
  currentWeekId: string
): Promise<SnapshotWithPlayers | null> {
  if (!fantasyTeamId || !currentWeekId) {
    return null;
  }

  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    // Get the current week to find its week_number
    const currentWeek = await uow.weeks.findById(currentWeekId);
    if (!currentWeek) {
      return null;
    }

    // Get all snapshots for this team
    const allSnapshots = await uow.fantasyTeamSnapshots.findByFantasyTeam(fantasyTeamId);
    if (allSnapshots.length === 0) {
      return null;
    }

    // Get all weeks to map week_id -> week_number
    const allWeeks = await uow.weeks.findBySeason(currentWeek.season_id);
    const weekNumberMap = new Map(allWeeks.map(w => [w.id, w.week_number]));

    // Find snapshots from weeks before the current week
    const priorSnapshots = allSnapshots
      .filter(s => {
        const weekNum = weekNumberMap.get(s.week_id);
        return weekNum !== undefined && weekNum < currentWeek.week_number;
      })
      .sort((a, b) => {
        const weekNumA = weekNumberMap.get(a.week_id) || 0;
        const weekNumB = weekNumberMap.get(b.week_id) || 0;
        return weekNumB - weekNumA; // Most recent first
      });

    if (priorSnapshots.length === 0) {
      return null;
    }

    // Get the most recent prior snapshot with its players
    const mostRecentSnapshot = priorSnapshots[0];
    const players = await uow.fantasyTeamSnapshotPlayers.findBySnapshot(mostRecentSnapshot.id);

    return {
      snapshot: mostRecentSnapshot,
      players,
    };
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

/**
 * Snapshot with full details for admin viewing
 */
export interface SnapshotWithDetails {
  snapshot: FantasyTeamSnapshot;
  players: Array<{
    player_id: string;
    position: FantasyPosition;
    is_benched: boolean;
    is_captain: boolean;
    player_value_at_snapshot: number;
    player?: {
      first_name: string;
      last_name: string;
    };
  }>;
  week?: {
    id: string;
    week_number: number;
    name?: string;
  };
}

/**
 * Get all snapshots with full details for a fantasy team
 * Used by admin panel to view team history
 */
export async function getAllSnapshotsWithDetailsForTeam(
  fantasyTeamId: string
): Promise<SnapshotWithDetails[]> {
  if (!fantasyTeamId) {
    return [];
  }

  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    // Get all snapshots for the team
    const snapshots = await uow.fantasyTeamSnapshots.findByFantasyTeam(fantasyTeamId);
    
    // Get all weeks for reference
    const fantasyTeam = await uow.fantasyTeams.findById(fantasyTeamId);
    const weeks = fantasyTeam ? await uow.weeks.findBySeason(fantasyTeam.season_id) : [];
    const weekMap = new Map(weeks.map(w => [w.id, w]));
    
    // Get all players for reference
    const allPlayerIds = new Set<string>();
    const snapshotPlayersMap = new Map<string, FantasyTeamSnapshotPlayer[]>();
    
    for (const snapshot of snapshots) {
      const snapshotPlayers = await uow.fantasyTeamSnapshotPlayers.findBySnapshot(snapshot.id);
      snapshotPlayersMap.set(snapshot.id, snapshotPlayers);
      snapshotPlayers.forEach(sp => allPlayerIds.add(sp.player_id));
    }
    
    // Fetch all players at once
    const players = await Promise.all(
      Array.from(allPlayerIds).map(id => uow.players.findById(id))
    );
    const playerMap = new Map(players.filter(Boolean).map(p => [p!.id, p!]));
    
    // Build the result
    const result: SnapshotWithDetails[] = snapshots.map(snapshot => {
      const snapshotPlayers = snapshotPlayersMap.get(snapshot.id) || [];
      const week = weekMap.get(snapshot.week_id);
      
      return {
        snapshot,
        players: snapshotPlayers.map(sp => {
          const player = playerMap.get(sp.player_id);
          return {
            player_id: sp.player_id,
            position: sp.position,
            is_benched: sp.is_benched,
            is_captain: sp.is_captain,
            player_value_at_snapshot: sp.player_value_at_snapshot,
            player: player ? {
              first_name: player.first_name,
              last_name: player.last_name,
            } : undefined,
          };
        }),
        week: week ? {
          id: week.id,
          week_number: week.week_number,
          name: week.name || undefined,
        } : undefined,
      };
    });
    
    // Sort by week number (most recent first)
    result.sort((a, b) => (b.week?.week_number || 0) - (a.week?.week_number || 0));
    
    return result;
  });
}
