/**
 * Fantasy Scoring Test Suite
 * Tests core fantasy functionality:
 * - Basic week-by-week scoring
 * - Late signup scenarios
 * - Retroactive score updates
 * - Auto-substitution
 * - Transfer limits
 * - Captain selection
 *
 * PREREQUISITES:
 * These tests require a SUPABASE_SERVICE_ROLE_KEY in your .env.local file
 * to bypass RLS policies and create test data. Without it, tests will be skipped.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestUnitOfWork,
  createTestSeason,
  createTestFantasyTeam,
  createTestSnapshot,
  createTestPlayerStats,
  createTestTransfer,
  completeGame,
  buildTestRoster,
  generateTestUserId,
  TestDataIds,
  TestPlayer,
} from './test-data-factory';
import { cleanupTestData } from './test-cleanup';
import { UnitOfWork } from '@/lib/domain/unit-of-work';
import { FantasyScoreService } from '@/lib/domain/services/fantasy-score.service';
import { TransferService } from '@/lib/domain/services/transfer.service';

// Check if service role key is available for running tests
const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use describe.skipIf to skip entire suite when service role key not available
describe.skipIf(!hasServiceRoleKey)('Fantasy Scoring System', () => {
  let uow: UnitOfWork;
  let ids: TestDataIds;
  let players: TestPlayer[];
  let scoreService: FantasyScoreService;
  let transferService: TransferService;

  beforeAll(async () => {
    // Create unit of work and services
    uow = createTestUnitOfWork();
    scoreService = new FantasyScoreService(uow);
    transferService = new TransferService(uow);

    // Create test season with teams, players, weeks, and games
    const testData = await createTestSeason(uow);
    ids = testData.ids;
    players = testData.players;
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    // Clean up all test data
    if (ids && uow) {
      await cleanupTestData(uow, ids);
    }
  }, 60000); // 60 second timeout for cleanup

  // ============================================
  // Scenario 1: Basic Week-by-Week Scoring
  // ============================================
  describe('Basic Week-by-Week Scoring', () => {
    let fantasyTeamId: string;
    const testUserId = generateTestUserId('scoring');

    beforeAll(async () => {
      // Create a fantasy team
      const fantasyTeam = await createTestFantasyTeam(uow, ids, testUserId, 'Test Scoring Team');
      fantasyTeamId = fantasyTeam.id;
    });

    it('calculates correct score for a complete week', async () => {
      const weekId = ids.weekIds[0];
      const gameId = ids.gameIds[0];

      // Build a roster from available players
      const roster = buildTestRoster(players);

      // Create snapshot
      await createTestSnapshot(uow, ids, fantasyTeamId, weekId, roster);

      // Add player stats for each starting player
      // Player scoring formula: goals + assists*2 + blocks*3 - drops - throwaways
      const captainPlayer = roster.find(p => p.isCaptain)!;
      const startingPlayers = roster.filter(p => !p.isBenched);

      // Captain scores 5 points (1 goal + 2 assists)
      await createTestPlayerStats(uow, ids, captainPlayer.playerId, gameId, {
        goals: 1,
        assists: 2,
        blocks: 0,
        drops: 0,
        throwaways: 0,
        played: true,
      });

      // Other starters score various points
      for (const player of startingPlayers) {
        if (player.playerId !== captainPlayer.playerId) {
          await createTestPlayerStats(uow, ids, player.playerId, gameId, {
            goals: 2,
            assists: 1,
            blocks: 1,
            drops: 0,
            throwaways: 0,
            played: true,
          });
        }
      }

      // Complete the game
      await completeGame(uow, gameId, 15, 10);

      // Calculate score
      const result = await scoreService.calculateWeekScore(fantasyTeamId, weekId);

      // Verify captain points are doubled
      // Captain: 1 goal + 2*2 assists = 5 points, doubled = 10 captain points
      expect(result.captainPoints).toBe(10);

      // Other starters: 6 players * (2 goals + 2 assists + 3 blocks) = 6 * 7 = 42 points
      expect(result.totalPoints).toBe(42);
    });

    it('only starting lineup scores (not benched players)', async () => {
      const weekId = ids.weekIds[1];
      const gameId = ids.gameIds[1];

      // Build roster
      const roster = buildTestRoster(players);

      // Create snapshot for week 2
      await createTestSnapshot(uow, ids, fantasyTeamId, weekId, roster);

      // Add stats for benched players only
      const benchedPlayers = roster.filter(p => p.isBenched);
      for (const player of benchedPlayers) {
        await createTestPlayerStats(uow, ids, player.playerId, gameId, {
          goals: 10,
          assists: 10,
          blocks: 10,
          drops: 0,
          throwaways: 0,
          played: true,
        });
      }

      // Starting players have 0 stats
      const startingPlayers = roster.filter(p => !p.isBenched);
      for (const player of startingPlayers) {
        await createTestPlayerStats(uow, ids, player.playerId, gameId, {
          goals: 0,
          assists: 0,
          blocks: 0,
          drops: 0,
          throwaways: 0,
          played: true,
        });
      }

      await completeGame(uow, gameId, 15, 10);

      // Calculate score
      const result = await scoreService.calculateWeekScore(fantasyTeamId, weekId);

      // Benched players' points should NOT be included
      expect(result.totalPoints).toBe(0);
      expect(result.captainPoints).toBe(0);
    });
  });

  // ============================================
  // Scenario 2: Late Signup
  // ============================================
  describe('Late Signup Scenarios', () => {
    let lateSignupTeamId: string;
    const lateUserId = generateTestUserId('late');

    beforeAll(async () => {
      // Create a fantasy team that "joins" in week 3
      const fantasyTeam = await createTestFantasyTeam(uow, ids, lateUserId, 'Late Signup Team');
      lateSignupTeamId = fantasyTeam.id;
    });

    it('team joining in Week 3 has correct first week behavior', async () => {
      const week3Id = ids.weekIds[2];

      // Check if this is the team's first week (no previous snapshots)
      const isFirst = await transferService.isFirstWeek(lateSignupTeamId, week3Id);
      expect(isFirst).toBe(true);

      // Remaining transfers should be Infinity in first week (unlimited roster changes)
      const remaining = await transferService.getRemainingTransfers(lateSignupTeamId, week3Id);
      expect(remaining).toBe(Infinity);

      // Week 1 and 2 should show no snapshots for this team
      const week1Id = ids.weekIds[0];
      const week2Id = ids.weekIds[1];

      const snapshot1 = await uow.fantasyTeamSnapshots.findByFantasyTeamAndWeek(lateSignupTeamId, week1Id);
      const snapshot2 = await uow.fantasyTeamSnapshots.findByFantasyTeamAndWeek(lateSignupTeamId, week2Id);

      expect(snapshot1).toBeNull();
      expect(snapshot2).toBeNull();
    });

    it('late signup team has correct transfer limits in Week 4', async () => {
      const week3Id = ids.weekIds[2];
      const week4Id = ids.weekIds[3];

      // Create first snapshot in week 3
      const roster = buildTestRoster(players);
      await createTestSnapshot(uow, ids, lateSignupTeamId, week3Id, roster);

      // Now check week 4
      const isFirst = await transferService.isFirstWeek(lateSignupTeamId, week4Id);
      expect(isFirst).toBe(false);

      // Should have 2 transfers available (since no transfers used in week 4)
      const remaining = await transferService.getRemainingTransfers(lateSignupTeamId, week4Id);
      expect(remaining).toBe(2);
    });
  });

  // ============================================
  // Scenario 3: Retroactive Score Updates
  // ============================================
  describe('Retroactive Score Updates', () => {
    let retroTeamId: string;
    const retroUserId = generateTestUserId('retro');

    beforeAll(async () => {
      const fantasyTeam = await createTestFantasyTeam(uow, ids, retroUserId, 'Retroactive Test Team');
      retroTeamId = fantasyTeam.id;
    });

    it('recalculating from a week updates all subsequent weeks', async () => {
      const week1Id = ids.weekIds[0];
      const week2Id = ids.weekIds[1];
      const game1Id = ids.gameIds[0];
      const game2Id = ids.gameIds[1];

      // Create snapshots for week 1 and 2
      const roster = buildTestRoster(players);
      await createTestSnapshot(uow, ids, retroTeamId, week1Id, roster);
      await createTestSnapshot(uow, ids, retroTeamId, week2Id, roster);

      // Add stats for week 1
      const captainPlayer = roster.find(p => p.isCaptain)!;
      await createTestPlayerStats(uow, ids, captainPlayer.playerId, game1Id, {
        goals: 2,
        assists: 1,
        blocks: 0,
        played: true,
      });

      // Add stats for week 2
      await createTestPlayerStats(uow, ids, captainPlayer.playerId, game2Id, {
        goals: 3,
        assists: 0,
        blocks: 1,
        played: true,
      });

      await completeGame(uow, game1Id, 15, 10);
      await completeGame(uow, game2Id, 12, 8);

      // Calculate and save initial scores
      await scoreService.calculateAndSaveWeekScore(retroTeamId, week1Id);
      await scoreService.calculateAndSaveWeekScore(retroTeamId, week2Id);

      // Get initial scores
      const initialScore1 = await uow.getClient()
        .from('fantasy_team_scores')
        .select('*')
        .eq('fantasy_team_id', retroTeamId)
        .eq('week_id', week1Id)
        .single();

      expect(initialScore1.data).toBeTruthy();
      const initialPoints1 = initialScore1.data!.total_points;

      // Update week 1 stats (simulate stat correction - add more goals)
      const stats1 = await uow.playerStats.findByPlayerAndGame(captainPlayer.playerId, game1Id);
      if (stats1) {
        await uow.playerStats.update({
          id: stats1.id,
          goals: 5, // Changed from 2 to 5
        });
      }

      // Recalculate from week 1
      await scoreService.recalculateAllSubsequentWeeks(retroTeamId, week1Id);

      // Check updated score
      const updatedScore1 = await uow.getClient()
        .from('fantasy_team_scores')
        .select('*')
        .eq('fantasy_team_id', retroTeamId)
        .eq('week_id', week1Id)
        .single();

      expect(updatedScore1.data).toBeTruthy();
      // Score should have increased (captain doubled)
      // Original: 2 goals + 2 assists = 4, doubled = 8
      // New: 5 goals + 2 assists = 7, doubled = 14
      expect(updatedScore1.data!.total_points).toBeGreaterThan(initialPoints1);
    });
  });

  // ============================================
  // Scenario 4: Auto-Substitution
  // ============================================
  describe('Auto-Substitution', () => {
    let autoSubTeamId: string;
    const autoSubUserId = generateTestUserId('autosub');

    beforeAll(async () => {
      const fantasyTeam = await createTestFantasyTeam(uow, ids, autoSubUserId, 'Auto Sub Test Team');
      autoSubTeamId = fantasyTeam.id;
    });

    it('benched player substitutes when starter did not play', async () => {
      const weekId = ids.weekIds[0];
      const gameId = ids.gameIds[0];

      // Build roster
      const roster = buildTestRoster(players);
      const snapshotId = await createTestSnapshot(uow, ids, autoSubTeamId, weekId, roster);

      // Find a starting handler and the benched handler
      const startingHandler = roster.find(p => p.position === 'handler' && !p.isBenched && !p.isCaptain);
      const benchedHandler = roster.find(p => p.position === 'handler' && p.isBenched);

      expect(startingHandler).toBeTruthy();
      expect(benchedHandler).toBeTruthy();

      // Starting handler did NOT play
      await createTestPlayerStats(uow, ids, startingHandler!.playerId, gameId, {
        goals: 0,
        assists: 0,
        blocks: 0,
        played: false, // Did not play!
      });

      // Benched handler DID play with good stats
      await createTestPlayerStats(uow, ids, benchedHandler!.playerId, gameId, {
        goals: 5,
        assists: 3,
        blocks: 2,
        played: true,
      });

      // Other starters played with minimal stats
      for (const player of roster.filter(p => !p.isBenched && p.playerId !== startingHandler!.playerId)) {
        await createTestPlayerStats(uow, ids, player.playerId, gameId, {
          goals: 0,
          assists: 0,
          blocks: 0,
          played: true,
        });
      }

      await completeGame(uow, gameId, 15, 10);

      // Calculate score
      const result = await scoreService.calculateWeekScore(autoSubTeamId, weekId);

      // Should have at least one substitution
      expect(result.substitutions.length).toBeGreaterThan(0);

      // The benched handler's points should be included
      // Benched handler: 5 goals + 6 assists + 6 blocks = 17 points
      expect(result.totalPoints).toBeGreaterThanOrEqual(17);
    });

    it('no substitution if benched player also did not play', async () => {
      const weekId = ids.weekIds[1];
      const gameId = ids.gameIds[1];

      // Build roster
      const roster = buildTestRoster(players);
      await createTestSnapshot(uow, ids, autoSubTeamId, weekId, roster);

      // Find a starting cutter and the benched cutter
      const startingCutter = roster.find(p => p.position === 'cutter' && !p.isBenched && !p.isCaptain);
      const benchedCutter = roster.find(p => p.position === 'cutter' && p.isBenched);

      // Neither played
      await createTestPlayerStats(uow, ids, startingCutter!.playerId, gameId, {
        played: false,
      });

      await createTestPlayerStats(uow, ids, benchedCutter!.playerId, gameId, {
        played: false,
      });

      // Other starters played
      for (const player of roster.filter(p => !p.isBenched && p.playerId !== startingCutter!.playerId)) {
        await createTestPlayerStats(uow, ids, player.playerId, gameId, {
          goals: 1,
          assists: 1,
          blocks: 1,
          played: true,
        });
      }

      await completeGame(uow, gameId, 15, 10);

      // Calculate score
      const result = await scoreService.calculateWeekScore(autoSubTeamId, weekId);

      // No substitution should occur (benched player also didn't play)
      const cutterSubstitution = result.substitutions.find(
        s => s.playerOut === startingCutter!.playerId
      );
      expect(cutterSubstitution).toBeUndefined();
    });
  });

  // ============================================
  // Scenario 5: Transfer Limits
  // ============================================
  describe('Transfer Limits', () => {
    let transferTeamId: string;
    const transferUserId = generateTestUserId('transfer');

    beforeAll(async () => {
      const fantasyTeam = await createTestFantasyTeam(uow, ids, transferUserId, 'Transfer Test Team');
      transferTeamId = fantasyTeam.id;
    });

    it('first week has unlimited transfers (free roster selection)', async () => {
      const week1Id = ids.weekIds[0];

      // Check first week status
      const isFirst = await transferService.isFirstWeek(transferTeamId, week1Id);
      expect(isFirst).toBe(true);

      // Get remaining transfers - should be Infinity (unlimited for first week)
      const remaining = await transferService.getRemainingTransfers(transferTeamId, week1Id);
      expect(remaining).toBe(Infinity);

      // Note: Transfer validation now happens at snapshot save time in FantasyTeamSnapshotService
      // First week allows unlimited changes to roster (no transfer limit)
    });

    it('subsequent weeks limited to 2 transfers (computed from snapshot diffs)', async () => {
      const week1Id = ids.weekIds[0];
      const week2Id = ids.weekIds[1];

      // Create snapshot for week 1 to establish "first week"
      const roster = buildTestRoster(players);
      await createTestSnapshot(uow, ids, transferTeamId, week1Id, roster);

      // Week 2 should not be first week
      const isFirst = await transferService.isFirstWeek(transferTeamId, week2Id);
      expect(isFirst).toBe(false);

      // Before any week 2 snapshot, should have 2 transfers available
      let remaining = await transferService.getRemainingTransfers(transferTeamId, week2Id);
      expect(remaining).toBe(2);

      // Create week 2 snapshot with 1 player change (1 transfer)
      const rosterWith1Transfer = [...roster];
      // Swap players[10] for roster[0] - find a player not in roster
      const availablePlayers = players.filter(p => !roster.some(r => r.playerId === p.id));
      if (availablePlayers.length > 0) {
        rosterWith1Transfer[0] = {
          ...rosterWith1Transfer[0],
          playerId: availablePlayers[0].id,
        };
      }
      await createTestSnapshot(uow, ids, transferTeamId, week2Id, rosterWith1Transfer);

      // Now remaining should be 1 (2 max - 1 used)
      remaining = await transferService.getRemainingTransfers(transferTeamId, week2Id);
      expect(remaining).toBe(1);

      // Note: To test 0 remaining, we'd need to create snapshot with 2 player changes
      // Transfers are computed from diff between week1 and week2 snapshots
    });
  });

  // ============================================
  // Scenario 6: Captain Selection
  // ============================================
  describe('Captain Selection', () => {
    let captainTeamId: string;
    const captainUserId = generateTestUserId('captain');

    beforeAll(async () => {
      const fantasyTeam = await createTestFantasyTeam(uow, ids, captainUserId, 'Captain Test Team');
      captainTeamId = fantasyTeam.id;
    });

    it('captain points are doubled', async () => {
      const weekId = ids.weekIds[0];
      const gameId = ids.gameIds[0];

      // Build roster with captain
      const roster = buildTestRoster(players);
      const captain = roster.find(p => p.isCaptain)!;

      await createTestSnapshot(uow, ids, captainTeamId, weekId, roster);

      // Captain scores exactly 5 points (1 goal + 2 assists)
      await createTestPlayerStats(uow, ids, captain.playerId, gameId, {
        goals: 1,
        assists: 2,
        blocks: 0,
        drops: 0,
        throwaways: 0,
        played: true,
      });

      // Other starters score 0
      for (const player of roster.filter(p => !p.isBenched && !p.isCaptain)) {
        await createTestPlayerStats(uow, ids, player.playerId, gameId, {
          goals: 0,
          assists: 0,
          blocks: 0,
          played: true,
        });
      }

      await completeGame(uow, gameId, 15, 10);

      // Calculate score
      const result = await scoreService.calculateWeekScore(captainTeamId, weekId);

      // Captain: 1 goal + 2*2 assists = 5 points, doubled = 10 captain points
      expect(result.captainPoints).toBe(10);
      // Other players scored 0
      expect(result.totalPoints).toBe(0);
    });

    it('snapshot requires exactly one captain', async () => {
      const weekId = ids.weekIds[1];

      // Try to create snapshot with no captain
      const noCaptainRoster = buildTestRoster(players).map(p => ({
        ...p,
        isCaptain: false, // No captain
      }));

      // Creating a snapshot without a captain should fail or be rejected
      // We check the snapshot service logic through the score calculation
      await createTestSnapshot(uow, ids, captainTeamId, weekId, noCaptainRoster);

      // Attempting to calculate score should throw because no captain
      await expect(
        scoreService.calculateWeekScore(captainTeamId, weekId)
      ).rejects.toThrow('No captain found');
    });
  });
});
