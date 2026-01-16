/**
 * Test Data Factory
 * Creates isolated test data for fantasy scoring tests
 * All test data is prefixed with "__TEST__" for easy identification and cleanup
 */

import { createClient } from '@supabase/supabase-js';
import { createUnitOfWork, UnitOfWork } from '@/lib/domain/unit-of-work';
import { FantasyPosition } from '@/lib/domain/types';

const TEST_PREFIX = '__TEST__';

export interface TestDataIds {
  seasonId: string;
  weekIds: string[];
  teamIds: string[];
  playerIds: string[];
  gameIds: string[];
  fantasyTeamIds: string[];
  snapshotIds: string[];
  snapshotPlayerIds: string[];
  playerStatsIds: string[];
  transferIds: string[];
  fantasyTeamPlayerIds: string[];
  seasonPlayerIds: string[];
  userProfileIds: string[];
}

export interface TestPlayer {
  id: string;
  first_name: string;
  last_name: string;
  position: FantasyPosition;
  teamId: string;
  value: number;
}

export interface TestFantasyTeam {
  id: string;
  ownerId: string;
  seasonId: string;
  name: string;
}

/**
 * Create a Supabase client for testing
 *
 * IMPORTANT: Tests require SUPABASE_SERVICE_ROLE_KEY to bypass RLS policies.
 * Add this to your .env.local file:
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 *
 * You can find the service role key in your Supabase project settings:
 *   Project Settings > API > service_role (secret)
 */
export function createTestClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role key for tests (bypasses RLS), fall back to anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables for tests');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      '\n⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found.\n' +
      '   Tests will likely fail due to RLS policies.\n' +
      '   Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.\n'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Create a Unit of Work for testing
 */
export function createTestUnitOfWork(): UnitOfWork {
  return createUnitOfWork(createTestClient());
}

/**
 * Generate a unique test identifier
 */
function generateTestId(): string {
  return `${TEST_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a complete test season with teams, players, weeks, and games
 */
export async function createTestSeason(uow: UnitOfWork): Promise<{
  ids: TestDataIds;
  players: TestPlayer[];
}> {
  const ids: TestDataIds = {
    seasonId: '',
    weekIds: [],
    teamIds: [],
    playerIds: [],
    gameIds: [],
    fantasyTeamIds: [],
    snapshotIds: [],
    snapshotPlayerIds: [],
    playerStatsIds: [],
    transferIds: [],
    fantasyTeamPlayerIds: [],
    seasonPlayerIds: [],
    userProfileIds: [],
  };

  const testId = generateTestId();

  // 1. Create test season
  const season = await uow.seasons.create({
    name: `${testId}_Season`,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    is_active: true,
  });
  ids.seasonId = season.id;

  // 2. Create 4 test weeks
  for (let i = 1; i <= 4; i++) {
    const weekStart = new Date(Date.now() + (i - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const cutoffTime = new Date(weekEnd.getTime() - 24 * 60 * 60 * 1000); // 1 day before week end

    const week = await uow.weeks.create({
      season_id: season.id,
      week_number: i,
      name: `${testId}_Week_${i}`,
      start_date: weekStart.toISOString(),
      end_date: weekEnd.toISOString(),
      is_draft_week: i === 1,
      transfer_window_open: true,
      transfer_cutoff_time: cutoffTime.toISOString(),
    });
    ids.weekIds.push(week.id);
  }

  // 3. Create 2 test teams with 10 players each
  const positions: FantasyPosition[] = ['handler', 'handler', 'handler', 'cutter', 'cutter', 'cutter', 'cutter', 'receiver', 'receiver', 'receiver'];
  const players: TestPlayer[] = [];

  for (let t = 1; t <= 2; t++) {
    const team = await uow.teams.create({
      name: `${testId}_Team_${t}`,
      slug: `${testId.toLowerCase()}-team-${t}`,
      color: t === 1 ? '#FF0000' : '#0000FF',
    });
    ids.teamIds.push(team.id);

    // Create 10 players per team
    for (let p = 1; p <= 10; p++) {
      const position = positions[p - 1];
      const baseValue = position === 'handler' ? 50 : position === 'cutter' ? 40 : 35;
      const value = baseValue + Math.floor(Math.random() * 10);

      const player = await uow.players.create({
        first_name: `${testId}_Player`,
        last_name: `T${t}P${p}`,
        team_id: team.id,
        player_role: p <= 2 ? 'marquee' : 'player',
        position: position,
        starting_value: value,
        is_active: true,
      });
      ids.playerIds.push(player.id);

      // Create season player link
      const seasonPlayer = await uow.seasonPlayers.create({
        season_id: season.id,
        player_id: player.id,
        team_id: team.id,
        starting_value: value,
        is_active: true,
      });
      ids.seasonPlayerIds.push(seasonPlayer.id);

      players.push({
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        position: position,
        teamId: team.id,
        value: value,
      });
    }
  }

  // 4. Create games for each week (team 1 vs team 2)
  for (const weekId of ids.weekIds) {
    const game = await uow.games.create({
      week_id: weekId,
      home_team_id: ids.teamIds[0],
      away_team_id: ids.teamIds[1],
      scheduled_time: new Date().toISOString(),
      is_completed: false,
    });
    ids.gameIds.push(game.id);
  }

  return { ids, players };
}

// Cache for test user ID
let cachedTestUserId: string | null = null;

/**
 * Get a valid user ID for testing
 *
 * Uses TEST_USER_ID env var if set, otherwise queries for first existing user.
 * The user_profiles table has a FK constraint to auth.users, so we can't create
 * fake users - we must use a real one.
 *
 * Set TEST_USER_ID in .env.local to use a specific user for tests.
 */
export async function getTestUserId(uow: UnitOfWork): Promise<string> {
  // Return cached value if available
  if (cachedTestUserId) {
    return cachedTestUserId;
  }

  // Check for env var first
  if (process.env.TEST_USER_ID) {
    cachedTestUserId = process.env.TEST_USER_ID;
    return cachedTestUserId;
  }

  // Query for an existing user profile
  const client = uow.getClient();
  const { data: existingUser, error } = await client
    .from('user_profiles')
    .select('id')
    .limit(1)
    .single();

  if (error || !existingUser) {
    throw new Error(
      'No existing user found for tests. Either:\n' +
      '1. Set TEST_USER_ID in .env.local to a valid user ID, or\n' +
      '2. Ensure at least one user exists in the database'
    );
  }

  cachedTestUserId = existingUser.id;
  if (!cachedTestUserId) {
    throw new Error('User ID is null');
  }
  return cachedTestUserId;
}

/**
 * Create a fantasy team for testing
 * Uses an existing user from the database (see getTestUserId)
 */
export async function createTestFantasyTeam(
  uow: UnitOfWork,
  ids: TestDataIds,
  _ownerSuffix: string, // Ignored, kept for API compatibility
  name?: string
): Promise<TestFantasyTeam> {
  // Get a real user ID (we can't create fake users due to auth.users FK)
  const ownerId = await getTestUserId(uow);

  const testId = generateTestId();
  const fantasyTeam = await uow.fantasyTeams.create({
    owner_id: ownerId,
    season_id: ids.seasonId,
    name: name || `${testId}_FantasyTeam`,
    original_value: 450,
    total_value: 450,
  });

  ids.fantasyTeamIds.push(fantasyTeam.id);

  return {
    id: fantasyTeam.id,
    ownerId: ownerId,
    seasonId: ids.seasonId,
    name: fantasyTeam.name,
  };
}

/**
 * Add players to a fantasy team's current roster
 */
export async function addPlayersToFantasyTeam(
  uow: UnitOfWork,
  ids: TestDataIds,
  fantasyTeamId: string,
  playerIds: string[],
  captainPlayerId?: string
): Promise<void> {
  for (const playerId of playerIds) {
    const fantasyTeamPlayer = await uow.fantasyTeamPlayers.create({
      fantasy_team_id: fantasyTeamId,
      player_id: playerId,
      is_captain: playerId === captainPlayerId,
      is_reserve: false,
      is_active: true,
    });
    ids.fantasyTeamPlayerIds.push(fantasyTeamPlayer.id);
  }
}

/**
 * Create a snapshot for a fantasy team for a specific week
 */
export async function createTestSnapshot(
  uow: UnitOfWork,
  ids: TestDataIds,
  fantasyTeamId: string,
  weekId: string,
  players: Array<{
    playerId: string;
    position: FantasyPosition;
    isBenched: boolean;
    isCaptain: boolean;
    value: number;
  }>
): Promise<string> {
  const captainPlayer = players.find(p => p.isCaptain);

  const totalValue = players.reduce((sum, p) => sum + p.value, 0);
  const snapshot = await uow.fantasyTeamSnapshots.create({
    fantasy_team_id: fantasyTeamId,
    week_id: weekId,
    captain_player_id: captainPlayer?.playerId,
    total_value: totalValue,
    budget_remaining: 550 - totalValue, // Calculate budget as SALARY_CAP - team value
  });
  ids.snapshotIds.push(snapshot.id);

  // Create snapshot players
  for (const player of players) {
    const snapshotPlayer = await uow.fantasyTeamSnapshotPlayers.create({
      snapshot_id: snapshot.id,
      player_id: player.playerId,
      position: player.position,
      is_benched: player.isBenched,
      is_captain: player.isCaptain,
      player_value_at_snapshot: player.value,
    });
    ids.snapshotPlayerIds.push(snapshotPlayer.id);
  }

  return snapshot.id;
}

/**
 * Create or update player stats for a game
 * Uses upsert to handle duplicate player/game combinations
 */
export async function createTestPlayerStats(
  uow: UnitOfWork,
  ids: TestDataIds,
  playerId: string,
  gameId: string,
  stats: {
    goals?: number;
    assists?: number;
    blocks?: number;
    drops?: number;
    throwaways?: number;
    played?: boolean;
  }
): Promise<string> {
  const client = uow.getClient();

  // Check if stats already exist for this player/game
  const { data: existing } = await client
    .from('player_stats')
    .select('id')
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .single();

  if (existing) {
    // Update existing stats
    const { data, error } = await client
      .from('player_stats')
      .update({
        goals: stats.goals ?? 0,
        assists: stats.assists ?? 0,
        blocks: stats.blocks ?? 0,
        drops: stats.drops ?? 0,
        throwaways: stats.throwaways ?? 0,
        played: stats.played ?? true,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update player_stats: ${error.message}`);
    }

    return data.id;
  }

  // Create new stats
  const playerStats = await uow.playerStats.create({
    player_id: playerId,
    game_id: gameId,
    goals: stats.goals ?? 0,
    assists: stats.assists ?? 0,
    blocks: stats.blocks ?? 0,
    drops: stats.drops ?? 0,
    throwaways: stats.throwaways ?? 0,
    played: stats.played ?? true,
  });
  ids.playerStatsIds.push(playerStats.id);

  return playerStats.id;
}

/**
 * Create a transfer record
 */
export async function createTestTransfer(
  uow: UnitOfWork,
  ids: TestDataIds,
  fantasyTeamId: string,
  weekId: string,
  playerInId: string,
  playerOutId: string,
  netTransferValue: number = 0
): Promise<string> {
  // Get week number for the round field (required by DB)
  const week = await uow.weeks.findById(weekId);
  const round = week?.week_number ?? 1;

  const transfer = await uow.transfers.create({
    fantasy_team_id: fantasyTeamId,
    week_id: weekId,
    player_in_id: playerInId,
    player_out_id: playerOutId,
    net_transfer_value: netTransferValue,
    round: round,
  });
  ids.transferIds.push(transfer.id);

  return transfer.id;
}

/**
 * Mark a game as completed
 */
export async function completeGame(
  uow: UnitOfWork,
  gameId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  await uow.games.update({
    id: gameId,
    is_completed: true,
    home_score: homeScore,
    away_score: awayScore,
  });
}

/**
 * Get players by position from a player list
 */
export function getPlayersByPosition(players: TestPlayer[], position: FantasyPosition): TestPlayer[] {
  return players.filter(p => p.position === position);
}

/**
 * Build a valid 10-player roster (7 starters + 3 bench)
 * Returns array with first 7 being starters, last 3 being bench
 */
export function buildTestRoster(players: TestPlayer[]): Array<{
  playerId: string;
  position: FantasyPosition;
  isBenched: boolean;
  isCaptain: boolean;
  value: number;
}> {
  const handlers = getPlayersByPosition(players, 'handler');
  const cutters = getPlayersByPosition(players, 'cutter');
  const receivers = getPlayersByPosition(players, 'receiver');

  // Need: 2 handlers, 3 cutters, 2 receivers starting
  // Bench: 1 handler, 1 cutter, 1 receiver
  const roster = [
    // Starters (7)
    { playerId: handlers[0].id, position: 'handler' as FantasyPosition, isBenched: false, isCaptain: true, value: handlers[0].value },
    { playerId: handlers[1].id, position: 'handler' as FantasyPosition, isBenched: false, isCaptain: false, value: handlers[1].value },
    { playerId: cutters[0].id, position: 'cutter' as FantasyPosition, isBenched: false, isCaptain: false, value: cutters[0].value },
    { playerId: cutters[1].id, position: 'cutter' as FantasyPosition, isBenched: false, isCaptain: false, value: cutters[1].value },
    { playerId: cutters[2].id, position: 'cutter' as FantasyPosition, isBenched: false, isCaptain: false, value: cutters[2].value },
    { playerId: receivers[0].id, position: 'receiver' as FantasyPosition, isBenched: false, isCaptain: false, value: receivers[0].value },
    { playerId: receivers[1].id, position: 'receiver' as FantasyPosition, isBenched: false, isCaptain: false, value: receivers[1].value },
    // Bench (3)
    { playerId: handlers[2].id, position: 'handler' as FantasyPosition, isBenched: true, isCaptain: false, value: handlers[2].value },
    { playerId: cutters[3].id, position: 'cutter' as FantasyPosition, isBenched: true, isCaptain: false, value: cutters[3].value },
    { playerId: receivers[2].id, position: 'receiver' as FantasyPosition, isBenched: true, isCaptain: false, value: receivers[2].value },
  ];

  return roster;
}

/**
 * Generate a test user ID (valid UUID format)
 * Uses deterministic UUIDs based on suffix for reproducibility
 */
export function generateTestUserId(suffix: string = '1'): string {
  // Create a deterministic but valid UUID based on suffix
  // Format: 00000000-0000-4000-a000-{12 hex chars from suffix hash}
  const hash = suffix.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const hexHash = Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12);
  return `00000000-0000-4000-a000-${hexHash}`;
}
