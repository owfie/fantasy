/**
 * Test Cleanup Utilities
 * Removes test data after tests complete
 * Deletes in correct order to respect foreign key constraints
 */

import { UnitOfWork } from '@/lib/domain/unit-of-work';
import { TestDataIds, createTestClient } from './test-data-factory';

const TEST_PREFIX = '__TEST__';

/**
 * Clean up all test data using tracked IDs
 * Deletes in reverse dependency order to avoid foreign key violations
 */
export async function cleanupTestData(uow: UnitOfWork, ids: TestDataIds): Promise<void> {
  const client = uow.getClient();

  // Order matters! Delete child records before parent records
  // 1. Fantasy team scores (depends on fantasy_team, week)
  if (ids.fantasyTeamIds.length > 0) {
    await client
      .from('fantasy_team_scores')
      .delete()
      .in('fantasy_team_id', ids.fantasyTeamIds);
  }

  // 2. Transfers (depends on fantasy_team, week, players)
  if (ids.transferIds.length > 0) {
    await client
      .from('transfers')
      .delete()
      .in('id', ids.transferIds);
  }

  // 3. Fantasy team snapshot players (depends on snapshot, player)
  if (ids.snapshotPlayerIds.length > 0) {
    await client
      .from('fantasy_team_snapshot_players')
      .delete()
      .in('id', ids.snapshotPlayerIds);
  }

  // 4. Fantasy team snapshots (depends on fantasy_team, week)
  if (ids.snapshotIds.length > 0) {
    await client
      .from('fantasy_team_snapshots')
      .delete()
      .in('id', ids.snapshotIds);
  }

  // 5. Player stats (depends on player, game)
  if (ids.playerStatsIds.length > 0) {
    await client
      .from('player_stats')
      .delete()
      .in('id', ids.playerStatsIds);
  }

  // 6. Fantasy team players (depends on fantasy_team, player)
  if (ids.fantasyTeamPlayerIds.length > 0) {
    await client
      .from('fantasy_team_players')
      .delete()
      .in('id', ids.fantasyTeamPlayerIds);
  }

  // 7. Fantasy teams (depends on season, user)
  if (ids.fantasyTeamIds.length > 0) {
    await client
      .from('fantasy_teams')
      .delete()
      .in('id', ids.fantasyTeamIds);
  }

  // 8. Games (depends on week, teams)
  if (ids.gameIds.length > 0) {
    await client
      .from('games')
      .delete()
      .in('id', ids.gameIds);
  }

  // 9. Season players (depends on season, player, team)
  if (ids.seasonPlayerIds.length > 0) {
    await client
      .from('season_players')
      .delete()
      .in('id', ids.seasonPlayerIds);
  }

  // 10. Players (depends on team)
  if (ids.playerIds.length > 0) {
    await client
      .from('players')
      .delete()
      .in('id', ids.playerIds);
  }

  // 11. Weeks (depends on season)
  if (ids.weekIds.length > 0) {
    await client
      .from('weeks')
      .delete()
      .in('id', ids.weekIds);
  }

  // 12. Teams (no dependencies from test data)
  if (ids.teamIds.length > 0) {
    await client
      .from('teams')
      .delete()
      .in('id', ids.teamIds);
  }

  // 13. Season (root entity)
  if (ids.seasonId) {
    await client
      .from('seasons')
      .delete()
      .eq('id', ids.seasonId);
  }
}

/**
 * Emergency cleanup: Find and delete ALL test data by prefix
 * Use this if test data was not properly tracked
 */
export async function cleanupAllTestData(): Promise<void> {
  const client = createTestClient();

  console.log('Starting emergency cleanup of all test data...');

  // Delete in order of dependencies
  // Find test seasons first
  const { data: testSeasons } = await client
    .from('seasons')
    .select('id')
    .like('name', `${TEST_PREFIX}%`);

  if (!testSeasons || testSeasons.length === 0) {
    console.log('No test data found');
    return;
  }

  const seasonIds = testSeasons.map(s => s.id);
  console.log(`Found ${seasonIds.length} test seasons to clean up`);

  // Get all related IDs
  const { data: testWeeks } = await client
    .from('weeks')
    .select('id')
    .in('season_id', seasonIds);
  const weekIds = testWeeks?.map(w => w.id) || [];

  const { data: testGames } = await client
    .from('games')
    .select('id')
    .in('week_id', weekIds);
  const gameIds = testGames?.map(g => g.id) || [];

  const { data: testFantasyTeams } = await client
    .from('fantasy_teams')
    .select('id')
    .in('season_id', seasonIds);
  const fantasyTeamIds = testFantasyTeams?.map(ft => ft.id) || [];

  const { data: testPlayers } = await client
    .from('players')
    .select('id')
    .like('first_name', `${TEST_PREFIX}%`);
  const playerIds = testPlayers?.map(p => p.id) || [];

  const { data: testTeams } = await client
    .from('teams')
    .select('id')
    .like('name', `${TEST_PREFIX}%`);
  const teamIds = testTeams?.map(t => t.id) || [];

  // Delete in order
  if (fantasyTeamIds.length > 0) {
    await client.from('fantasy_team_scores').delete().in('fantasy_team_id', fantasyTeamIds);
    await client.from('transfers').delete().in('fantasy_team_id', fantasyTeamIds);

    const { data: snapshots } = await client
      .from('fantasy_team_snapshots')
      .select('id')
      .in('fantasy_team_id', fantasyTeamIds);
    const snapshotIds = snapshots?.map(s => s.id) || [];

    if (snapshotIds.length > 0) {
      await client.from('fantasy_team_snapshot_players').delete().in('snapshot_id', snapshotIds);
      await client.from('fantasy_team_snapshots').delete().in('id', snapshotIds);
    }

    await client.from('fantasy_team_players').delete().in('fantasy_team_id', fantasyTeamIds);
    await client.from('fantasy_teams').delete().in('id', fantasyTeamIds);
  }

  if (gameIds.length > 0) {
    await client.from('player_stats').delete().in('game_id', gameIds);
    await client.from('games').delete().in('id', gameIds);
  }

  if (playerIds.length > 0) {
    await client.from('season_players').delete().in('player_id', playerIds);
    await client.from('players').delete().in('id', playerIds);
  }

  if (weekIds.length > 0) {
    await client.from('weeks').delete().in('id', weekIds);
  }

  if (teamIds.length > 0) {
    await client.from('teams').delete().in('id', teamIds);
  }

  if (seasonIds.length > 0) {
    await client.from('seasons').delete().in('id', seasonIds);
  }

  console.log('Emergency cleanup complete');
}

/**
 * Verify all test data was cleaned up
 */
export async function verifyCleanup(ids: TestDataIds): Promise<boolean> {
  const client = createTestClient();

  // Check if any test data remains
  const checks = await Promise.all([
    client.from('seasons').select('id').eq('id', ids.seasonId).single(),
    client.from('weeks').select('id').in('id', ids.weekIds),
    client.from('teams').select('id').in('id', ids.teamIds),
    client.from('players').select('id').in('id', ids.playerIds),
    client.from('games').select('id').in('id', ids.gameIds),
    client.from('fantasy_teams').select('id').in('id', ids.fantasyTeamIds),
  ]);

  const hasRemainingData = checks.some(
    result => result.data && (Array.isArray(result.data) ? result.data.length > 0 : result.data)
  );

  return !hasRemainingData;
}
