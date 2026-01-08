import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Game, InsertGame, UpdateGame, Team, Player, PlayerAvailability } from '../types';

export interface GameWithTeams extends Game {
  home_team: Team;
  away_team: Team;
}

export interface PlayerWithAvailability extends Player {
  availability?: PlayerAvailability;
}

export interface GameWithDetails extends GameWithTeams {
  home_team_players: PlayerWithAvailability[];
  away_team_players: PlayerWithAvailability[];
}

export class GamesRepository extends BaseRepository<Game, InsertGame, UpdateGame> {
  constructor(client: SupabaseClient) {
    super(client, 'games');
  }

  async findByWeek(weekId: string): Promise<Game[]> {
    return this.findAll({ week_id: weekId } as Partial<Game>);
  }

  async findByTeam(teamId: string): Promise<Game[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

    if (error) {
      throw new Error(`Failed to find games by team: ${error.message}`);
    }

    return (data || []) as Game[];
  }

  /**
   * Fetch a single game with teams (optimized for single game lookups)
   */
  async findByIdWithTeams(gameId: string): Promise<GameWithTeams | null> {
    const game = await this.findById(gameId);
    if (!game) {
      return null;
    }

    const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean) as string[];
    const { data: teams, error: teamsError } = await this.client
      .from('teams')
      .select('*')
      .in('id', teamIds);

    if (teamsError) {
      throw new Error(`Failed to find teams: ${teamsError.message}`);
    }

    const teamMap = new Map((teams || []).map(team => [team.id, team as Team]));
    const homeTeam = teamMap.get(game.home_team_id);
    const awayTeam = teamMap.get(game.away_team_id);

    if (!homeTeam || !awayTeam) {
      throw new Error('Failed to find teams for game');
    }

    return {
      ...game,
      home_team: homeTeam,
      away_team: awayTeam,
    } as GameWithTeams;
  }

  /**
   * Fetch all games with teams, ordered by scheduled_time
   */
  async findAllWithTeams(): Promise<GameWithTeams[]> {
    const { data: games, error: gamesError } = await this.client
      .from(this.tableName)
      .select('*')
      .order('scheduled_time', { ascending: true, nullsFirst: false });

    if (gamesError) {
      throw new Error(`Failed to find games: ${gamesError.message}`);
    }

    if (!games || games.length === 0) {
      return [];
    }

    // Get unique team IDs
    const teamIds = new Set<string>();
    (games as Game[]).forEach(game => {
      if (game.home_team_id) teamIds.add(game.home_team_id);
      if (game.away_team_id) teamIds.add(game.away_team_id);
    });

    // Fetch all teams in one query
    const { data: teams, error: teamsError } = await this.client
      .from('teams')
      .select('*')
      .in('id', Array.from(teamIds));

    if (teamsError) {
      throw new Error(`Failed to find teams: ${teamsError.message}`);
    }

    // Create a map of team ID to team
    const teamMap = new Map((teams || []).map(team => [team.id, team as Team]));

    // Combine games with teams
    return (games || []).map((game: Game) => ({
      ...game,
      home_team: teamMap.get(game.home_team_id)!,
      away_team: teamMap.get(game.away_team_id)!,
    })) as GameWithTeams[];
  }

  /**
   * Fetch a single game with teams and player availability
   */
  async findByIdWithDetails(gameId: string): Promise<GameWithDetails | null> {
    // First get the game
    const { data: gameData, error: gameError } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) {
      if (gameError.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find game: ${gameError.message}`);
    }

    if (!gameData) {
      return null;
    }

    const game = gameData as Game;

    // Fetch home and away teams
    const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean) as string[];
    const { data: teams, error: teamsError } = await this.client
      .from('teams')
      .select('*')
      .in('id', teamIds);

    if (teamsError) {
      throw new Error(`Failed to find teams: ${teamsError.message}`);
    }

    const teamMap = new Map((teams || []).map(team => [team.id, team as Team]));
    const homeTeam = teamMap.get(game.home_team_id);
    const awayTeam = teamMap.get(game.away_team_id);

    if (!homeTeam || !awayTeam) {
      throw new Error('Failed to find teams for game');
    }

    // Get all players from both teams in a single query
    const { data: allPlayers, error: playersError } = await this.client
      .from('players')
      .select('*')
      .in('team_id', [game.home_team_id, game.away_team_id])
      .eq('is_active', true);

    if (playersError) {
      throw new Error(`Failed to find players: ${playersError.message}`);
    }

    // Separate players by team
    const homePlayers = (allPlayers || []).filter((p: Player) => p.team_id === game.home_team_id);
    const awayPlayers = (allPlayers || []).filter((p: Player) => p.team_id === game.away_team_id);

    // Get availability records for this game
    const { data: availability, error: availabilityError } = await this.client
      .from('player_availability')
      .select('*')
      .eq('game_id', gameId);

    if (availabilityError) {
      throw new Error(`Failed to find player availability: ${availabilityError.message}`);
    }

    // Create a map of player_id -> availability
    const availabilityMap = new Map(
      (availability || []).map((av: PlayerAvailability) => [av.player_id, av])
    );

    // Combine players with their availability
    const homeTeamPlayers: PlayerWithAvailability[] = (homePlayers || []).map((player: Player) => ({
      ...player,
      availability: availabilityMap.get(player.id),
    }));

    const awayTeamPlayers: PlayerWithAvailability[] = (awayPlayers || []).map((player: Player) => ({
      ...player,
      availability: availabilityMap.get(player.id),
    }));

    return {
      ...game,
      home_team: homeTeam,
      away_team: awayTeam,
      home_team_players: homeTeamPlayers,
      away_team_players: awayTeamPlayers,
    } as GameWithDetails;
  }
}

