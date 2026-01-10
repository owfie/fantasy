/**
 * Test API - Server Actions
 * Test actions for verifying Unit of Work and domain functionality
 * Based on REQUIREMENTS.md
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { FantasyTeamService, TeamsService } from '@/lib/domain/services';
import { Team, Player, Week, InsertPlayerStats as InsertPlayerStatsType, UpdatePlayerStats } from '@/lib/domain/types';
import { getErrorMessage } from '@/lib/utils';

// ============================================
// TEST DASHBOARD DATA
// ============================================

interface PlayerPointsData {
  playerId: string;
  playerName: string;
  teamName?: string;
  weekPoints: Record<string, number>; // weekId -> points
  totalPoints: number;
}

export interface TestDashboardData {
  teams: Team[];
  players: Player[];
  weeks: Week[];
  playerPoints: PlayerPointsData[];
  testData: {
    firstTeamId?: string;
    secondTeamId?: string;
    firstPlayerId?: string;
    firstFivePlayerIds?: string[];
    adminUserId?: string;
  };
}

export async function getTestDashboardData(seasonId?: string): Promise<TestDashboardData> {
  const uow = await getUnitOfWork();

  return uow.execute(async (uow) => {
    // Get all teams including soft-deleted (for admin view)
    const teamsList = await uow.teams.findAllIncludingDeleted();
    
    // If seasonId provided, get season players, otherwise get all active players
    let playersList;
    if (seasonId) {
      const seasonPlayers = await uow.seasonPlayers.findBySeasonWithPlayers(seasonId);
      playersList = seasonPlayers
        .filter(sp => sp.is_active && sp.player)
        .map(sp => sp.player);
    } else {
      playersList = await uow.players.findAll({ is_active: true });
    }
    
    // Get weeks for specific season or all weeks
    let weeksList;
    if (seasonId) {
      weeksList = await uow.weeks.findBySeason(seasonId);
    } else {
      weeksList = await uow.weeks.findAll();
    }
    const sortedWeeks = weeksList.sort((a, b) => a.week_number - b.week_number);
    
    // Get teams for player names
    const teamsMap = new Map(teamsList.map(t => [t.id, t.name]));
    
    // Get all player stats with game and week info in one query
    const { data: statsWithGames, error: statsError } = await uow.getClient()
      .from('player_stats')
      .select(`
        player_id,
        points,
        game_id,
        games!inner(week_id)
      `);
    
    // Build player points data
    const pointsMap = new Map<string, PlayerPointsData>();
    
    // Initialize all players
    for (const player of playersList) {
      pointsMap.set(player.id, {
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        teamName: player.team_id ? teamsMap.get(player.team_id) : undefined,
        weekPoints: {},
        totalPoints: 0,
      });
    }
    
    // Fill in points for each week
    if (statsWithGames && !statsError) {
      interface StatWithGame {
        player_id: string;
        points: number;
        games?: { week_id: string };
      }
      for (const stat of statsWithGames as unknown as StatWithGame[]) {
        const weekId = stat.games?.week_id;
        if (!weekId) continue;
        
        const playerData = pointsMap.get(stat.player_id);
        
        if (playerData) {
          // Sum points for this player/week (in case of multiple games per week)
          const currentPoints = playerData.weekPoints[weekId] || 0;
          playerData.weekPoints[weekId] = currentPoints + (stat.points || 0);
          playerData.totalPoints += (stat.points || 0);
        }
      }
    }
    
    // Build test data
    const testData: TestDashboardData['testData'] = {
      adminUserId: '2eb0941a-b6bf-418a-a711-4db9426f5161', // From migration
    };
    
    if (teamsList.length > 0 && playersList.length > 0) {
      testData.firstTeamId = teamsList[0].id;
      testData.secondTeamId = teamsList.length > 1 ? teamsList[1].id : teamsList[0].id;
      testData.firstPlayerId = playersList[0].id;
      testData.firstFivePlayerIds = playersList.slice(0, 10).map((p) => p.id);
    }
    
    return {
      teams: teamsList,
      players: playersList,
      weeks: sortedWeeks,
      playerPoints: Array.from(pointsMap.values()).sort((a, b) => b.totalPoints - a.totalPoints),
      testData,
    };
  });
}

// ============================================
// TEAMS CRUD OPERATIONS
// ============================================

// Create Team
export async function testCreateTeam(name: string, color?: string) {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  
  try {
    const team = await service.create({ name, color });
    return { success: true, message: 'Team created successfully', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Update Team
export async function testUpdateTeam(teamId: string, updates: { name?: string; color?: string }) {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  
  try {
    const team = await service.update({
      id: teamId,
      ...updates,
    });
    return { success: true, message: 'Team updated successfully', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Soft Delete Team
export async function testSoftDeleteTeam(teamId: string) {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  
  try {
    await service.deleteSoft(teamId);
    return { success: true, message: 'Team soft deleted successfully', data: null };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Hard Delete Team
export async function testHardDeleteTeam(teamId: string) {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  
  try {
    await service.deleteHard(teamId);
    return { success: true, message: 'Team permanently deleted', data: null };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Get Team by ID
export async function testGetTeam(teamId: string) {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  
  try {
    const team = await service.findById(teamId);
    if (!team) {
      return { success: false, message: 'Team not found', data: null };
    }
    return { success: true, message: 'Team retrieved', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Get All Teams (including soft-deleted for admin view)
export async function testGetAllTeams() {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  
  try {
    const teams = await service.findAllIncludingDeleted(); // Include deleted teams
    return { success: true, message: `Found ${teams.length} teams`, data: teams };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Restore Team
export async function testRestoreTeam(teamId: string) {
  const uow = await getUnitOfWork();
  const service = new TeamsService(uow);
  
  try {
    const team = await service.restore(teamId);
    return { success: true, message: 'Team restored successfully', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Test 2: Create a player
export async function testCreatePlayer(
  teamId: string,
  firstName: string,
  lastName: string,
  role: 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve',
  startingValue?: number,
  draftOrder?: number
) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    const playerData: {
      team_id: string;
      first_name: string;
      last_name: string;
      player_role: string;
      is_active: boolean;
      starting_value?: number;
      draft_order?: number;
    } = {
      team_id: teamId,
      first_name: firstName,
      last_name: lastName,
      player_role: role,
      is_active: true,
    };
    
    // Only set starting_value if provided
    if (startingValue !== undefined && startingValue !== null) {
      playerData.starting_value = startingValue;
    }
    
    // Only set draft_order if provided
    if (draftOrder !== undefined && draftOrder !== null) {
      playerData.draft_order = draftOrder;
    }
    
    const player = await uow.players.create(playerData);
    
    return { success: true, message: 'Player created', data: player };
  });
}

export async function testUpdatePlayer(
  playerId: string,
  updates: {
    team_id?: string;
    first_name?: string;
    last_name?: string;
    player_role?: 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve';
    position?: 'handler' | 'cutter' | 'receiver';
    starting_value?: number;
    draft_order?: number;
  }
) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    // Convert empty string position to null to clear it, or handle null explicitly
    const cleanUpdates: any = { ...updates };
    if ('position' in cleanUpdates) {
      if (cleanUpdates.position === '' || cleanUpdates.position === null) {
        cleanUpdates.position = null;
      }
    }
    
    const player = await uow.players.update({
      id: playerId,
      ...cleanUpdates,
    });
    
    return { success: true, message: 'Player updated', data: player };
  });
}

export async function testSoftDeletePlayer(playerId: string) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    const player = await uow.players.findById(playerId);
    if (!player) {
      return { success: false, message: 'Player not found', error: 'Player not found' };
    }
    
    await uow.players.update({
      id: playerId,
      is_active: false,
    });
    
    return { success: true, message: 'Player soft deleted', data: null };
  });
}

export async function testHardDeletePlayer(playerId: string) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    const player = await uow.players.findById(playerId);
    if (!player) {
      return { success: false, message: 'Player not found', error: 'Player not found' };
    }
    
    // Cascade delete: remove all player stats first
    const stats = await uow.playerStats.findAll({ player_id: playerId });
    for (const stat of stats) {
      await uow.playerStats.delete(stat.id);
    }
    
    await uow.players.delete(playerId);
    
    const deletedStatsCount = stats.length;
    return { 
      success: true, 
      message: deletedStatsCount > 0 
        ? `Player permanently deleted (${deletedStatsCount} stats also removed)` 
        : 'Player permanently deleted', 
      data: null 
    };
  });
}

export async function testRestorePlayer(playerId: string) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    const player = await uow.players.findById(playerId);
    if (!player) {
      return { success: false, message: 'Player not found', error: 'Player not found' };
    }
    
    await uow.players.update({
      id: playerId,
      is_active: true,
    });
    
    const restored = await uow.players.findById(playerId);
    
    return { success: true, message: 'Player restored', data: restored };
  });
}

export async function testGetPlayer(playerId: string) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    const player = await uow.players.findById(playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found', error: 'Player not found' };
    }
    
    return { success: true, message: 'Player found', data: player };
  });
}

export async function testGetAllPlayers() {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    // Get all players including inactive ones (for admin view)
    const { data: players, error } = await uow.getClient()
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return { success: false, message: 'Failed to fetch players', error: error.message };
    }
    
    return { success: true, message: 'Players fetched', data: players || [] };
  });
}

// Test 3: Create fantasy team with players (salary cap test)
export async function testCreateFantasyTeam(
  ownerId: string,
  seasonId: string,
  teamName: string,
  playerIds: string[]
) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  return uow.execute(async () => {
    const team = await service.createFantasyTeamWithPlayers(
      {
        owner_id: ownerId,
        season_id: seasonId,
        name: teamName,
        original_value: 0,
        total_value: 0,
      },
      playerIds.map((id, index) => ({
        playerId: id,
        isCaptain: index === 0, // First player is captain
        isReserve: index >= 7, // Last 3 are reserves
      }))
    );
    
    return { success: true, message: 'Fantasy team created', data: team };
  });
}

// Test 4: Calculate team value (salary cap)
export async function testCalculateTeamValue(fantasyTeamId: string) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  const value = await service.calculateTeamValue(fantasyTeamId);
  const team = await uow.fantasyTeams.findById(fantasyTeamId);
  
  return {
    success: true,
    message: 'Team value calculated',
    data: {
      calculatedValue: value,
      teamValue: team?.total_value,
      originalValue: team?.original_value,
    },
  };
}

// Test 5: Set captain (double points)
export async function testSetCaptain(fantasyTeamId: string, playerId: string) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  return uow.execute(async () => {
    await service.setCaptain(fantasyTeamId, playerId);
    const captain = await uow.fantasyTeamPlayers.findCaptain(fantasyTeamId);
    
    return {
      success: true,
      message: 'Captain set',
      data: captain,
    };
  });
}

// Test 6: Add player stats (goals, assists, blocks, drops, throwaways)
export async function testAddPlayerStats(
  playerId: string,
  gameId: string,
  stats: { goals: number; assists: number; blocks: number; drops: number; throwaways: number },
  enteredBy?: string
) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    // Check if stats already exist
    const existing = await uow.playerStats.findByPlayerAndGame(playerId, gameId);
    if (existing) {
      // Update existing stats
      const updated = await uow.playerStats.update({
        id: existing.id,
        goals: stats.goals,
        assists: stats.assists,
        blocks: stats.blocks,
        drops: stats.drops,
        throwaways: stats.throwaways,
        played: true,
        entered_by: enteredBy,
      });
      
      return {
        success: true,
        message: 'Player stats updated',
        data: updated,
        calculatedPoints: updated.points,
      };
    }
    
    // Create new stats
    const playerStats = await uow.playerStats.create({
      player_id: playerId,
      game_id: gameId,
      goals: stats.goals,
      assists: stats.assists,
      blocks: stats.blocks,
      drops: stats.drops,
      throwaways: stats.throwaways,
      played: true,
      entered_by: enteredBy,
    });
    
    return {
      success: true,
      message: 'Player stats created',
      data: playerStats,
      calculatedPoints: playerStats.points,
    };
  });
}

// Test 7: Get player stats and verify points calculation
export async function testGetPlayerStats(playerId: string) {
  const uow = await getUnitOfWork();
  
  const stats = await uow.playerStats.findByPlayer(playerId);
  
  return {
    success: true,
    message: 'Player stats retrieved',
    data: stats,
    totalPoints: stats.reduce((sum, s) => sum + s.points, 0),
  };
}

// Test 8: Add player to fantasy team
export async function testAddPlayerToTeam(
  fantasyTeamId: string,
  playerId: string,
  options?: { isCaptain?: boolean; isReserve?: boolean }
) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  return uow.execute(async () => {
    await service.addPlayerToTeam(fantasyTeamId, playerId, options);
    const team = await uow.fantasyTeams.findById(fantasyTeamId);
    
    return {
      success: true,
      message: 'Player added to team',
      data: team,
    };
  });
}

// Test 9: Remove player from fantasy team
export async function testRemovePlayerFromTeam(fantasyTeamId: string, playerId: string) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  return uow.execute(async () => {
    await service.removePlayerFromTeam(fantasyTeamId, playerId);
    const team = await uow.fantasyTeams.findById(fantasyTeamId);
    
    return {
      success: true,
      message: 'Player removed from team',
      data: team,
    };
  });
}

// Test 10: Get fantasy team with players
export async function testGetFantasyTeam(fantasyTeamId: string) {
  const uow = await getUnitOfWork();
  
  const team = await uow.fantasyTeams.findById(fantasyTeamId);
  if (!team) {
    return { success: false, message: 'Team not found', data: null };
  }
  
  const players = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
  const captain = await uow.fantasyTeamPlayers.findCaptain(fantasyTeamId);
  
  return {
    success: true,
    message: 'Fantasy team retrieved',
    data: {
      team,
      players,
      captain,
      playerCount: players.length,
      activePlayers: players.filter((p) => p.is_active && !p.is_reserve).length,
      reserves: players.filter((p) => p.is_reserve).length,
    },
  };
}

// Test 11: Transaction rollback test (should fail and rollback)
export async function testTransactionRollback() {
  const uow = await getUnitOfWork();
  
  try {
    return await uow.execute(async (uow) => {
      // Create a team
      const team = await uow.teams.create({ name: `Test Team ${Date.now()}` });
      
      // Try to create a player with invalid team_id (should fail)
      await uow.players.create({
        team_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        first_name: 'Test',
        last_name: 'Player',
        player_role: 'player',
        starting_value: 50,
        is_active: true,
      });
      
      return { success: true, message: 'Should not reach here', data: team };
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return {
      success: false,
      message: 'Transaction correctly rolled back',
      error: message,
    };
  }
}

// Test 12: Create test season and week
export async function testCreateSeasonAndWeek() {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    // Check if season already exists
    let season = await uow.seasons.findActive();
    
    if (!season) {
      // Create season
      season = await uow.seasons.create({
        name: 'Test Season 2024',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 weeks
        is_active: true,
      });
    }
    
    // Check if week 1 exists
    let week = await uow.weeks.findByWeekNumber(season.id, 1);
    
    if (!week) {
      // Create week 1
      week = await uow.weeks.create({
        season_id: season.id,
        week_number: 1,
        name: 'Week 1 - Pool Play',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_draft_week: false,
      });
    }
    
    return {
      success: true,
      message: 'Season and week ready',
      data: {
        season,
        week,
      },
    };
  });
}

// Test 13: Create test game
export async function testCreateGame(weekId: string, homeTeamId: string, awayTeamId: string) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    const game = await uow.games.create({
      week_id: weekId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_time: new Date().toISOString(),
      is_completed: false,
    });
    
    return {
      success: true,
      message: 'Game created',
      data: game,
    };
  });
}

// ============================================
// ADMIN DASHBOARD DATA
// ============================================

export interface PlayerWeekStats {
  playerId: string;
  playerName: string;
  playerRole: string;
  goals: number;
  assists: number;
  blocks: number;
  drops: number;
  throwaways: number;
  points: number;
  isCompleted: boolean;
  played: boolean;
}

export interface WeekStats {
  weekId: string;
  weekNumber: number;
  weekName?: string;
  completedCount: number;
  totalPlayers: number;
  playerStats: PlayerWeekStats[];
}

export interface AdminDashboardData {
  players: Player[];
  weeks: Week[];
  weekStats: WeekStats[];
  totalPlayers: number;
  weeksCompleted: number;
  totalWeeks: number;
}

export async function getAdminDashboardData(seasonId?: string): Promise<AdminDashboardData> {
  const uow = await getUnitOfWork();

  return uow.execute(async (uow) => {
    // If seasonId provided, get season players, otherwise get all active players
    let playersList;
    if (seasonId) {
      const seasonPlayers = await uow.seasonPlayers.findBySeasonWithPlayers(seasonId);
      playersList = seasonPlayers
        .filter(sp => sp.is_active && sp.player)
        .map(sp => sp.player);
    } else {
      playersList = await uow.players.findAll({ is_active: true });
    }
    
    // Get weeks for specific season or all weeks
    let weeksList;
    if (seasonId) {
      weeksList = await uow.weeks.findBySeason(seasonId);
    } else {
      weeksList = await uow.weeks.findAll();
    }
    const sortedWeeks = weeksList.sort((a, b) => a.week_number - b.week_number);
    
    // Get all games grouped by week
    const { data: games, error: gamesError } = await uow.getClient()
      .from('games')
      .select('id, week_id');
    
    const gamesByWeek = new Map<string, string[]>();
    if (games && !gamesError) {
      for (const game of games) {
        const weekGames = gamesByWeek.get(game.week_id) || [];
        weekGames.push(game.id);
        gamesByWeek.set(game.week_id, weekGames);
      }
    }
    
    // Get all player stats with full details
    const { data: allStats, error: statsError } = await uow.getClient()
      .from('player_stats')
      .select(`
        player_id,
        game_id,
        goals,
        assists,
        blocks,
        drops,
        throwaways,
        points,
        played,
        games!inner(week_id)
      `);
    
    // Build stats map: weekId -> playerId -> aggregated stats
    const statsByWeekAndPlayer = new Map<string, Map<string, {
      goals: number;
      assists: number;
      blocks: number;
      drops: number;
      throwaways: number;
      points: number;
      played: boolean;
    }>>();
    
    if (allStats && !statsError) {
      interface StatWithGame {
        player_id: string;
        game_id: string;
        goals: number;
        assists: number;
        blocks: number;
        drops: number;
        throwaways: number;
        points: number;
        played: boolean;
        games?: { week_id: string };
      }
      for (const stat of allStats as unknown as StatWithGame[]) {
        const weekId = stat.games?.week_id;
        if (!weekId) continue;
        
        if (!statsByWeekAndPlayer.has(weekId)) {
          statsByWeekAndPlayer.set(weekId, new Map());
        }
        
        const weekStats = statsByWeekAndPlayer.get(weekId)!;
        const playerId = stat.player_id;
        
        if (!weekStats.has(playerId)) {
          weekStats.set(playerId, {
            goals: 0,
            assists: 0,
            blocks: 0,
            drops: 0,
            throwaways: 0,
            points: 0,
            played: true, // Default to true
          });
        }
        
        const playerStats = weekStats.get(playerId)!;
        playerStats.goals += stat.goals || 0;
        playerStats.assists += stat.assists || 0;
        playerStats.blocks += stat.blocks || 0;
        playerStats.drops += stat.drops || 0;
        playerStats.throwaways += stat.throwaways || 0;
        playerStats.points += stat.points || 0;
        // A player can only play in one game per week, so we just use the played value directly
        // No aggregation needed - each player has at most one stat record per week
        if (stat.played !== undefined) {
          playerStats.played = stat.played;
        }
      }
    }
    
    // Build week stats
    const weekStats: WeekStats[] = sortedWeeks.map((week) => {
      const weekPlayerStats = statsByWeekAndPlayer.get(week.id) || new Map();
      const playerStatsList: PlayerWeekStats[] = playersList.map((player) => {
        const isReserve = player.player_role === 'reserve';
        const defaultPlayed = isReserve ? false : true;
        const stats = weekPlayerStats.get(player.id) || {
          goals: 0,
          assists: 0,
          blocks: 0,
          drops: 0,
          throwaways: 0,
          points: 0,
          played: defaultPlayed, // Default to false for reserves, true for others
        };
        
        // A player is completed if they have at least one stat entry (points > 0 or any stat > 0)
        const isCompleted = stats.points !== 0 || 
          stats.goals > 0 || 
          stats.assists > 0 || 
          stats.blocks > 0 || 
          stats.drops > 0 || 
          stats.throwaways > 0;
        
        return {
          playerId: player.id,
          playerName: `${player.first_name} ${player.last_name}`,
          playerRole: player.player_role,
          goals: stats.goals,
          assists: stats.assists,
          blocks: stats.blocks,
          drops: stats.drops,
          throwaways: stats.throwaways,
          points: stats.points,
          isCompleted,
          played: stats.played !== undefined ? stats.played : defaultPlayed,
        };
      });
      
      const completedCount = playerStatsList.filter(p => p.isCompleted).length;
      
      return {
        weekId: week.id,
        weekNumber: week.week_number,
        weekName: week.name,
        completedCount,
        totalPlayers: playersList.length,
        playerStats: playerStatsList,
      };
    });
    
    const weeksCompleted = weekStats.filter(w => w.completedCount === w.totalPlayers && w.totalPlayers > 0).length;
    
    return {
      players: playersList,
      weeks: sortedWeeks,
      weekStats,
      totalPlayers: playersList.length,
      weeksCompleted,
      totalWeeks: sortedWeeks.length,
    };
  });
}

export interface SaveWeekStatsInput {
  weekId: string;
  playerStats: Array<{
    playerId: string;
    goals: number;
    assists: number;
    blocks: number;
    drops: number;
    throwaways: number;
    played: boolean;
  }>;
  adminUserId?: string;
}

// ============================================
// FANTASY TEAMS CRUD OPERATIONS
// ============================================

export async function testGetUserProfiles() {
  const uow = await getUnitOfWork();
  
  try {
    const { data, error } = await uow.getClient()
      .from('user_profiles')
      .select('id, email, display_name, is_admin, created_at')
      .order('display_name', { ascending: true });
    
    if (error) {
      return { success: false, message: `Failed to fetch users: ${error.message}`, error: error.message };
    }
    
    return { success: true, message: `Found ${data?.length || 0} users`, data: data || [] };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testSetUserAdmin(userId: string, isAdmin: boolean) {
  const uow = await getUnitOfWork();
  
  try {
    const { data, error } = await uow.getClient()
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return { success: false, message: `Failed to update user: ${error.message}`, error: error.message };
    }
    
    return { 
      success: true, 
      message: isAdmin ? 'User is now an admin' : 'Admin privileges removed', 
      data 
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testGetActiveSeason() {
  const uow = await getUnitOfWork();
  
  try {
    const season = await uow.seasons.findActive();
    
    if (!season) {
      return { success: false, message: 'No active season found', data: null };
    }
    
    // Check if current date is within season range
    const now = new Date();
    const startDate = new Date(season.start_date);
    const endDate = new Date(season.end_date);
    
    if (now < startDate || now > endDate) {
      return { 
        success: true, 
        message: `Active season found but current date is outside range (${season.start_date} - ${season.end_date})`, 
        data: season 
      };
    }
    
    return { success: true, message: 'Active season found', data: season };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testGetAllFantasyTeams(seasonId?: string) {
  const uow = await getUnitOfWork();
  
  try {
    let query = uow.getClient()
      .from('fantasy_teams')
      .select(`
        *,
        user_profiles!owner_id(email, display_name),
        seasons!season_id(name)
      `);
    
    // Filter by season if provided
    if (seasonId) {
      query = query.eq('season_id', seasonId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return { success: false, message: `Failed to fetch fantasy teams: ${error.message}`, error: error.message };
    }
    
    return { success: true, message: `Found ${data?.length || 0} fantasy teams`, data: data || [] };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testGetFantasyTeamWithPlayers(fantasyTeamId: string) {
  const uow = await getUnitOfWork();
  
  try {
    const team = await uow.fantasyTeams.findById(fantasyTeamId);
    if (!team) {
      return { success: false, message: 'Fantasy team not found', data: null };
    }
    
    // Get players on this team with full player details
    const { data: teamPlayers, error: playersError } = await uow.getClient()
      .from('fantasy_team_players')
      .select(`
        *,
        players!player_id(id, first_name, last_name, player_role, starting_value, team_id)
      `)
      .eq('fantasy_team_id', fantasyTeamId)
      .order('is_captain', { ascending: false })
      .order('is_reserve', { ascending: true });
    
    if (playersError) {
      return { success: false, message: `Failed to fetch team players: ${playersError.message}`, error: playersError.message };
    }
    
    return {
      success: true,
      message: 'Fantasy team retrieved',
      data: {
        team,
        players: teamPlayers || [],
        playerCount: teamPlayers?.length || 0,
        activePlayers: teamPlayers?.filter(p => p.is_active && !p.is_reserve).length || 0,
        benchPlayers: teamPlayers?.filter(p => p.is_reserve).length || 0,
      },
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testCreateFantasyTeamEmpty(
  ownerId: string,
  seasonId: string,
  teamName: string
) {
  const uow = await getUnitOfWork();
  
  try {
    const team = await uow.fantasyTeams.create({
      owner_id: ownerId,
      season_id: seasonId,
      name: teamName,
      original_value: 0,
      total_value: 0,
    });
    
    return { success: true, message: 'Fantasy team created', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testUpdateFantasyTeam(
  fantasyTeamId: string,
  updates: { name?: string }
) {
  const uow = await getUnitOfWork();
  
  try {
    const team = await uow.fantasyTeams.update({
      id: fantasyTeamId,
      ...updates,
    });
    
    return { success: true, message: 'Fantasy team updated', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testDeleteFantasyTeam(fantasyTeamId: string) {
  const uow = await getUnitOfWork();
  
  try {
    // First delete all fantasy_team_players
    const { error: playersDeleteError } = await uow.getClient()
      .from('fantasy_team_players')
      .delete()
      .eq('fantasy_team_id', fantasyTeamId);
    
    if (playersDeleteError) {
      return { success: false, message: `Failed to delete team players: ${playersDeleteError.message}`, error: playersDeleteError.message };
    }
    
    // Then delete the fantasy team
    await uow.fantasyTeams.delete(fantasyTeamId);
    
    return { success: true, message: 'Fantasy team permanently deleted', data: null };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testAddPlayerToFantasyTeam(
  fantasyTeamId: string,
  playerId: string,
  options?: { isCaptain?: boolean; isBench?: boolean }
) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  try {
    await service.addPlayerToTeam(fantasyTeamId, playerId, {
      isCaptain: options?.isCaptain,
      isReserve: options?.isBench,
    });
    
    const team = await uow.fantasyTeams.findById(fantasyTeamId);
    return { success: true, message: 'Player added to team', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testRemovePlayerFromFantasyTeam(fantasyTeamId: string, playerId: string) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  try {
    await service.removePlayerFromTeam(fantasyTeamId, playerId);
    const team = await uow.fantasyTeams.findById(fantasyTeamId);
    return { success: true, message: 'Player removed from team', data: team };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testSetFantasyTeamCaptain(fantasyTeamId: string, playerId: string) {
  const uow = await getUnitOfWork();
  const service = new FantasyTeamService(uow);
  
  try {
    await service.setCaptain(fantasyTeamId, playerId);
    return { success: true, message: 'Captain set', data: null };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function testSetPlayerBenchStatus(
  fantasyTeamId: string,
  playerId: string,
  isBench: boolean
) {
  const uow = await getUnitOfWork();
  
  try {
    // Find the fantasy_team_player entry
    const players = await uow.fantasyTeamPlayers.findByFantasyTeam(fantasyTeamId);
    const player = players.find(p => p.player_id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found on this team', error: 'Player not found' };
    }
    
    await uow.fantasyTeamPlayers.update({
      id: player.id,
      is_reserve: isBench,
    });
    
    return { success: true, message: isBench ? 'Player moved to bench' : 'Player moved to active roster', data: null };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Get available players for a season (registered for the season and not on any fantasy team)
export async function testGetAvailablePlayers(seasonId: string) {
  const uow = await getUnitOfWork();
  
  try {
    // Use the database function to get available players for this season
    // This returns players registered in season_players but not on any fantasy team
    const { data, error } = await uow.getClient()
      .rpc('get_available_players_for_season', { p_season_id: seasonId });
    
    if (error) {
      // Fallback to manual query if function doesn't exist yet
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return await testGetAvailablePlayersLegacy(seasonId);
      }
      return { success: false, message: `Failed to fetch available players: ${error.message}`, error: error.message };
    }
    
    // Transform the result to match the Player interface
    const availablePlayers = (data || []).map((row: {
      player_id: string;
      first_name: string;
      last_name: string;
      player_role: string;
      starting_value: number;
      team_id: string | null;
    }) => ({
      id: row.player_id,
      first_name: row.first_name,
      last_name: row.last_name,
      player_role: row.player_role,
      starting_value: row.starting_value,
      team_id: row.team_id,
      is_active: true,
    }));
    
    return { success: true, message: `Found ${availablePlayers.length} available players for this season`, data: availablePlayers };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

// Legacy fallback for when the database function doesn't exist yet
async function testGetAvailablePlayersLegacy(seasonId: string) {
  const uow = await getUnitOfWork();
  
  try {
    // Get season players with player details
    const { data: seasonPlayers, error: spError } = await uow.getClient()
      .from('season_players')
      .select(`
        *,
        players!player_id(id, first_name, last_name, player_role)
      `)
      .eq('season_id', seasonId)
      .eq('is_active', true);
    
    if (spError) {
      return { success: false, message: `Failed to fetch season players: ${spError.message}`, error: spError.message };
    }
    
    // Get all fantasy teams in this season
    const fantasyTeams = await uow.fantasyTeams.findBySeason(seasonId);
    const fantasyTeamIds = fantasyTeams.map(t => t.id);
    
    let takenPlayerIds = new Set<string>();
    
    if (fantasyTeamIds.length > 0) {
      // Get all players already on fantasy teams
      const { data: takenPlayers, error } = await uow.getClient()
        .from('fantasy_team_players')
        .select('player_id')
        .in('fantasy_team_id', fantasyTeamIds);
      
      if (error) {
        return { success: false, message: `Failed to fetch taken players: ${error.message}`, error: error.message };
      }
      
      takenPlayerIds = new Set((takenPlayers || []).map(p => p.player_id));
    }
    
    // Filter to available players and transform
    interface SeasonPlayerWithDetails {
      player_id: string;
      starting_value: number;
      team_id?: string;
      players: {
        id: string;
        first_name: string;
        last_name: string;
        player_role: string;
      };
    }
    
    const availablePlayers = (seasonPlayers || [])
      .filter((sp: SeasonPlayerWithDetails) => !takenPlayerIds.has(sp.player_id))
      .map((sp: SeasonPlayerWithDetails) => ({
        id: sp.player_id,
        first_name: sp.players.first_name,
        last_name: sp.players.last_name,
        player_role: sp.players.player_role,
        starting_value: sp.starting_value, // Use season-specific value
        team_id: sp.team_id,
        is_active: true,
      }));
    
    return { success: true, message: `Found ${availablePlayers.length} available players for this season`, data: availablePlayers };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    return { success: false, message, error: message };
  }
}

export async function saveWeekStats(input: SaveWeekStatsInput) {
  const uow = await getUnitOfWork();
  
  return uow.execute(async (uow) => {
    // Get or create a default game for this week
    // First, try to find an existing game
    const { data: existingGames } = await uow.getClient()
      .from('games')
      .select('id')
      .eq('week_id', input.weekId)
      .limit(1);
    
    let gameId: string;
    
    if (existingGames && existingGames.length > 0) {
      gameId = existingGames[0].id;
    } else {
      // Create a default game - we need teams for this
      // Get first two teams
      const teams = await uow.teams.findAll();
      if (teams.length < 2) {
        throw new Error('Need at least 2 teams to create a game');
      }
      
      const game = await uow.games.create({
        week_id: input.weekId,
        home_team_id: teams[0].id,
        away_team_id: teams[1].id,
        scheduled_time: new Date().toISOString(),
        is_completed: false,
      });
      gameId = game.id;
      
      // Set default availability for all active season players
      const { setDefaultAvailabilityForGame } = await import('./availability.api');
      await setDefaultAvailabilityForGame(gameId);
    }
    
    // Batch fetch all existing stats for this game in one query
    const { data: allExistingStats, error: fetchError } = await uow.getClient()
      .from('player_stats')
      .select('*')
      .eq('game_id', gameId);
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing stats: ${fetchError.message}`);
    }
    
    // Create a map of existing stats by player_id
    interface ExistingStat {
      id: string;
      player_id: string;
      game_id: string;
      goals: number;
      assists: number;
      blocks: number;
      drops: number;
      throwaways: number;
      points: number;
      played: boolean | null;
      entered_by?: string | null;
    }
    const existingStatsMap = new Map<string, ExistingStat>();
    if (allExistingStats) {
      for (const stat of allExistingStats as ExistingStat[]) {
        existingStatsMap.set(stat.player_id, stat);
      }
    }
    
    // Separate stats into creates and updates
    const toCreate: InsertPlayerStatsType[] = [];
    const toUpdate: UpdatePlayerStats[] = [];
    
    for (const playerStat of input.playerStats) {
      const existing = existingStatsMap.get(playerStat.playerId);
      
      if (existing) {
        // Normalize played values for comparison (treat null/undefined as true)
        const existingPlayed = existing.played !== null && existing.played !== undefined ? existing.played : true;
        const newPlayed = playerStat.played !== undefined ? playerStat.played : true;
        
        // Check if anything actually changed
        const hasChanges = 
          existing.goals !== playerStat.goals ||
          existing.assists !== playerStat.assists ||
          existing.blocks !== playerStat.blocks ||
          existing.drops !== playerStat.drops ||
          existing.throwaways !== playerStat.throwaways ||
          existingPlayed !== newPlayed;
        
        if (hasChanges) {
          toUpdate.push({
            id: existing.id,
            goals: playerStat.goals,
            assists: playerStat.assists,
            blocks: playerStat.blocks,
            drops: playerStat.drops,
            throwaways: playerStat.throwaways,
            played: newPlayed,
            entered_by: input.adminUserId,
          });
        }
      } else {
        // Create new stats (even if all zeros, as the user explicitly wants to save this)
        toCreate.push({
          player_id: playerStat.playerId,
          game_id: gameId,
          goals: playerStat.goals,
          assists: playerStat.assists,
          blocks: playerStat.blocks,
          drops: playerStat.drops,
          throwaways: playerStat.throwaways,
          played: playerStat.played !== undefined ? playerStat.played : true,
          entered_by: input.adminUserId,
        });
      }
    }
    
    // Batch create new stats
    let createdCount = 0;
    if (toCreate.length > 0) {
      const { data: created, error: createError } = await uow.getClient()
        .from('player_stats')
        .insert(toCreate)
        .select();
      
      if (createError) {
        throw new Error(`Failed to create player stats: ${createError.message}`);
      }
      createdCount = created?.length || 0;
    }
    
    // Batch update existing stats
    let updatedCount = 0;
    if (toUpdate.length > 0) {
      // Supabase doesn't support batch updates directly, so we'll do them in parallel
      const updatePromises = toUpdate.map((stat) =>
        uow.playerStats.update(stat)
      );
      await Promise.all(updatePromises);
      updatedCount = toUpdate.length;
    }
    
    return {
      success: true,
      message: `Saved stats: ${createdCount} created, ${updatedCount} updated`,
      data: {
        gameId,
        statsCount: createdCount + updatedCount,
        createdCount,
        updatedCount,
      },
    };
  });
}

