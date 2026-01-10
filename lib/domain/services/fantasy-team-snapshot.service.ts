/**
 * Fantasy Team Snapshot Service
 * Handles creating and managing immutable weekly snapshots of fantasy teams
 */

import { UnitOfWork } from '../unit-of-work';
import {
  InsertFantasyTeamSnapshot,
  InsertFantasyTeamSnapshotPlayer,
  FantasyTeamSnapshot,
  FantasyPosition,
  FantasyTeamSnapshotPlayer,
} from '../types';
import { ValueTrackingService } from './value-tracking.service';

export interface LineupValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LineupCounts {
  handlers: { starting: number; bench: number };
  cutters: { starting: number; bench: number };
  receivers: { starting: number; bench: number };
}

export class FantasyTeamSnapshotService {
  private valueTracking: ValueTrackingService;

  constructor(private uow: UnitOfWork) {
    this.valueTracking = new ValueTrackingService(uow);
  }

  /**
   * Validate lineup position constraints
   * Starting: 3 handlers, 2 cutters, 2 receivers (7 total)
   * Bench: 1 handler, 1 cutter, 1 receiver (3 total)
   * Total: 10 players
   * 
   * @param allowPartial - If true, allows teams with fewer than 10 players (for team building)
   */
  validateLineup(
    players: Array<{ position: FantasyPosition; isBenched: boolean }>,
    allowPartial: boolean = false
  ): LineupValidationResult {
    const errors: string[] = [];

    // Only require exactly 10 players if not allowing partial teams
    if (!allowPartial && players.length !== 10) {
      errors.push(`Must have exactly 10 players, found ${players.length}`);
    }
    
    // For partial teams, still validate we don't exceed maximums
    const maxPerPosition: Record<FantasyPosition, { starting: number; bench: number }> = {
      handler: { starting: 3, bench: 1 },
      cutter: { starting: 2, bench: 1 },
      receiver: { starting: 2, bench: 1 },
    };

    const counts: LineupCounts = {
      handlers: { starting: 0, bench: 0 },
      cutters: { starting: 0, bench: 0 },
      receivers: { starting: 0, bench: 0 },
    };

    const validPositions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/29f81711-5913-4fd4-beed-99bc2d01ecd2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fantasy-team-snapshot.service.ts:66',message:'validateLineup called',data:{playerCount:players.length,allowPartial,players:players.map(p=>({position:p.position,isBenched:p.isBenched}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Map singular position to plural counts key
    const positionToCountsKey: Record<FantasyPosition, keyof LineupCounts> = {
      handler: 'handlers',
      cutter: 'cutters',
      receiver: 'receivers',
    };
    
    for (const player of players) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/29f81711-5913-4fd4-beed-99bc2d01ecd2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fantasy-team-snapshot.service.ts:76',message:'Processing player',data:{position:player.position,isBenched:player.isBenched,positionType:typeof player.position,validPositions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Validate position exists and is valid
      if (!player.position || typeof player.position !== 'string' || !validPositions.includes(player.position)) {
        errors.push(`Invalid position '${player.position}' for player`);
        continue;
      }
      
      // Map singular position to plural counts key
      const countsKey = positionToCountsKey[player.position];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/29f81711-5913-4fd4-beed-99bc2d01ecd2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fantasy-team-snapshot.service.ts:86',message:'Mapped position to counts key',data:{position:player.position,countsKey,countsKeys:Object.keys(counts),positionCountsExists:!!counts[countsKey]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      const positionCounts = counts[countsKey];
      if (!positionCounts) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/29f81711-5913-4fd4-beed-99bc2d01ecd2',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fantasy-team-snapshot.service.ts:91',message:'Position counts not found',data:{position:player.position,countsKey,availableKeys:Object.keys(counts)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        errors.push(`Position '${player.position}' not found in counts`);
        continue;
      }
      
      if (player.isBenched) {
        positionCounts.bench++;
      } else {
        positionCounts.starting++;
      }
    }

    // Validate starting lineup - use exact counts if not allowing partial, or check maximums if allowing partial
    if (allowPartial) {
      // For partial teams, only check that we don't exceed maximums
      if (counts.handlers.starting > maxPerPosition.handler.starting) {
        errors.push(`Cannot have more than ${maxPerPosition.handler.starting} handlers in starting lineup, found ${counts.handlers.starting}`);
      }
      if (counts.cutters.starting > maxPerPosition.cutter.starting) {
        errors.push(`Cannot have more than ${maxPerPosition.cutter.starting} cutters in starting lineup, found ${counts.cutters.starting}`);
      }
      if (counts.receivers.starting > maxPerPosition.receiver.starting) {
        errors.push(`Cannot have more than ${maxPerPosition.receiver.starting} receivers in starting lineup, found ${counts.receivers.starting}`);
      }
      
      // For partial teams, only check bench maximums
      if (counts.handlers.bench > maxPerPosition.handler.bench) {
        errors.push(`Cannot have more than ${maxPerPosition.handler.bench} handlers on bench, found ${counts.handlers.bench}`);
      }
      if (counts.cutters.bench > maxPerPosition.cutter.bench) {
        errors.push(`Cannot have more than ${maxPerPosition.cutter.bench} cutters on bench, found ${counts.cutters.bench}`);
      }
      if (counts.receivers.bench > maxPerPosition.receiver.bench) {
        errors.push(`Cannot have more than ${maxPerPosition.receiver.bench} receivers on bench, found ${counts.receivers.bench}`);
      }
    } else {
      // For complete teams, require exact counts
      if (counts.handlers.starting !== 3) {
        errors.push(`Must have exactly 3 handlers in starting lineup, found ${counts.handlers.starting}`);
      }
      if (counts.cutters.starting !== 2) {
        errors.push(`Must have exactly 2 cutters in starting lineup, found ${counts.cutters.starting}`);
      }
      if (counts.receivers.starting !== 2) {
        errors.push(`Must have exactly 2 receivers in starting lineup, found ${counts.receivers.starting}`);
      }

      // Validate bench
      if (counts.handlers.bench !== 1) {
        errors.push(`Must have exactly 1 handler on bench, found ${counts.handlers.bench}`);
      }
      if (counts.cutters.bench !== 1) {
        errors.push(`Must have exactly 1 cutter on bench, found ${counts.cutters.bench}`);
      }
      if (counts.receivers.bench !== 1) {
        errors.push(`Must have exactly 1 receiver on bench, found ${counts.receivers.bench}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get lineup counts for a snapshot
   */
  async getLineupCounts(snapshotId: string): Promise<LineupCounts> {
    const players = await this.uow.fantasyTeamSnapshotPlayers.findBySnapshot(snapshotId);
    
    const counts: LineupCounts = {
      handlers: { starting: 0, bench: 0 },
      cutters: { starting: 0, bench: 0 },
      receivers: { starting: 0, bench: 0 },
    };

    // Map singular position to plural counts key
    const positionToCountsKey: Record<FantasyPosition, keyof LineupCounts> = {
      handler: 'handlers',
      cutter: 'cutters',
      receiver: 'receivers',
    };

    for (const player of players) {
      const countsKey = positionToCountsKey[player.position as FantasyPosition];
      if (!countsKey) {
        // Skip invalid positions
        continue;
      }
      const positionCounts = counts[countsKey];
      if (!positionCounts) {
        // Skip invalid positions
        continue;
      }
      if (player.is_benched) {
        positionCounts.bench++;
      } else {
        positionCounts.starting++;
      }
    }

    return counts;
  }

  /**
   * Calculate total value for a snapshot using player values at that week
   */
  async calculateSnapshotValue(snapshotId: string): Promise<number> {
    const snapshot = await this.uow.fantasyTeamSnapshots.findById(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const snapshotPlayers = await this.uow.fantasyTeamSnapshotPlayers.findBySnapshot(snapshotId);
    
    // Sum the stored values (they were captured at snapshot creation time)
    return snapshotPlayers.reduce((sum, sp) => sum + sp.player_value_at_snapshot, 0);
  }

  /**
   * Create a snapshot for a specific week from the current fantasy team state
   * This captures the immutable state of the team at that point in time
   */
  async createSnapshotForWeek(
    fantasyTeamId: string,
    weekId: string,
    players: Array<{
      playerId: string;
      position: FantasyPosition;
      isBenched: boolean;
      isCaptain: boolean;
    }>,
    allowPartial: boolean = false
  ): Promise<FantasyTeamSnapshot> {
    return this.uow.execute(async (uow) => {
      // Validate lineup - allow partial teams during initial team building
      const validation = this.validateLineup(
        players.map(p => ({ position: p.position, isBenched: p.isBenched })),
        allowPartial
      );
      if (!validation.valid) {
        throw new Error(`Invalid lineup: ${validation.errors.join(', ')}`);
      }

      // Check for existing snapshot - if exists, we'll delete it first (handled by API)
      // This method creates a new snapshot, the API layer handles updates

      // Get week and season info
      const week = await uow.weeks.findById(weekId);
      if (!week) {
        throw new Error('Week not found');
      }

      const fantasyTeam = await uow.fantasyTeams.findById(fantasyTeamId);
      if (!fantasyTeam) {
        throw new Error('Fantasy team not found');
      }

      // Find captain - for partial teams, allow no captain (will be set later)
      const captain = players.find(p => p.isCaptain);
      if (!captain && !allowPartial) {
        throw new Error('Must have exactly one captain');
      }
      
      // For partial teams without a captain, use the first player as a temporary captain
      const captainPlayer = captain || players[0];
      if (!captainPlayer) {
        throw new Error('Cannot create snapshot with no players');
      }

      // Get player values for this week
      const playerIds = players.map(p => p.playerId);
      const playerValues = await this.valueTracking.getPlayerValuesForWeek(
        playerIds,
        week.week_number,
        fantasyTeam.season_id
      );

      // Calculate total value
      const totalValue = Array.from(playerValues.values()).reduce((sum, value) => sum + value, 0);

      // Create snapshot
      const snapshot: InsertFantasyTeamSnapshot = {
        fantasy_team_id: fantasyTeamId,
        week_id: weekId,
        captain_player_id: captainPlayer.playerId,
        total_value: totalValue,
      };

      const createdSnapshot = await uow.fantasyTeamSnapshots.create(snapshot);

      // Create snapshot players
      const snapshotPlayers: InsertFantasyTeamSnapshotPlayer[] = players.map(player => ({
        snapshot_id: createdSnapshot.id,
        player_id: player.playerId,
        position: player.position,
        is_benched: player.isBenched,
        is_captain: player.isCaptain,
        player_value_at_snapshot: playerValues.get(player.playerId) || 0,
      }));

      await uow.fantasyTeamSnapshotPlayers.createMany(snapshotPlayers);

      return createdSnapshot;
    });
  }

  /**
   * Get snapshot for a specific week
   */
  async getSnapshotForWeek(fantasyTeamId: string, weekId: string): Promise<FantasyTeamSnapshot | null> {
    return this.uow.fantasyTeamSnapshots.findByFantasyTeamAndWeek(fantasyTeamId, weekId);
  }

  /**
   * Get all snapshots for a fantasy team
   */
  async getSnapshotsForTeam(fantasyTeamId: string): Promise<FantasyTeamSnapshot[]> {
    return this.uow.fantasyTeamSnapshots.findByFantasyTeam(fantasyTeamId);
  }

  /**
   * Get snapshot with players
   */
  async getSnapshotWithPlayers(snapshotId: string): Promise<{
    snapshot: FantasyTeamSnapshot;
    players: FantasyTeamSnapshotPlayer[];
  }> {
    const snapshot = await this.uow.fantasyTeamSnapshots.findById(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const players = await this.uow.fantasyTeamSnapshotPlayers.findBySnapshot(snapshotId);

    return { snapshot, players };
  }

  /**
   * Create snapshot from current fantasy_team_players state
   * This is useful when creating a snapshot from the current team composition
   */
  async createSnapshotFromCurrentTeam(
    fantasyTeamId: string,
    weekId: string
  ): Promise<FantasyTeamSnapshot> {
    return this.uow.execute(async (uow) => {
      // Get current team players
      const teamPlayers = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
      
      if (teamPlayers.length === 0) {
        throw new Error('Fantasy team has no players');
      }

      // Get player details to get positions
      const playerDetails = await Promise.all(
        teamPlayers.map(tp => uow.players.findById(tp.player_id))
      );

      // Build players array for snapshot
      const players = teamPlayers.map((tp, index) => {
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

      return this.createSnapshotForWeek(fantasyTeamId, weekId, players);
    });
  }
}

