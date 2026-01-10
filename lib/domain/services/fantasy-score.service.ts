/**
 * Fantasy Score Service
 * Handles score calculation with auto-substitution and retroactive recalculation
 */

import { UnitOfWork } from '../unit-of-work';
import { InsertFantasyTeamScore, FantasyTeamSnapshotPlayer, PlayerStats } from '../types';
import { FantasyTeamSnapshotService } from './fantasy-team-snapshot.service';

export interface ScoreCalculationResult {
  totalPoints: number;
  captainPoints: number;
  substitutions: Array<{
    playerOut: string;
    playerIn: string;
    reason: string;
  }>;
}

export class FantasyScoreService {
  private snapshotService: FantasyTeamSnapshotService;

  constructor(private uow: UnitOfWork) {
    this.snapshotService = new FantasyTeamSnapshotService(uow);
  }

  /**
   * Apply auto-substitution if a non-benched player missed a game
   * Returns the player to use (either original or substituted)
   */
  async applyAutoSubstitution(
    snapshotId: string,
    playerId: string,
    gameId: string
  ): Promise<{ playerId: string; substituted: boolean; reason?: string }> {
    // Check if player actually played
    const stats = await this.uow.playerStats.findByPlayerAndGame(playerId, gameId);
    
    if (stats && stats.played) {
      // Player played, no substitution needed
      return { playerId, substituted: false };
    }

    // Player didn't play - check if they were in starting lineup
    const snapshotPlayers = await this.uow.fantasyTeamSnapshotPlayers.findBySnapshot(snapshotId);
    const player = snapshotPlayers.find(sp => sp.player_id === playerId);

    if (!player) {
      // Player not in snapshot (shouldn't happen)
      return { playerId, substituted: false };
    }

    if (player.is_benched) {
      // Player was benched, no substitution needed
      return { playerId, substituted: false };
    }

    // Player was in starting lineup but didn't play - find benched player of same position
    const benchedPlayer = snapshotPlayers.find(
      sp => sp.position === player.position && sp.is_benched && !sp.is_captain
    );

    if (!benchedPlayer) {
      // No benched player of same position available
      return { playerId, substituted: false, reason: 'No benched player of same position available' };
    }

    // Check if benched player actually played
    const benchedStats = await this.uow.playerStats.findByPlayerAndGame(benchedPlayer.player_id, gameId);
    if (!benchedStats || !benchedStats.played) {
      // Benched player also didn't play
      return { playerId, substituted: false, reason: 'Benched player of same position also did not play' };
    }

    // Substitute benched player
    return {
      playerId: benchedPlayer.player_id,
      substituted: true,
      reason: `${player.position} did not play, substituted with benched ${player.position}`,
    };
  }

  /**
   * Calculate score for a week from a snapshot
   * Only counts non-benched players (with auto-substitution)
   * Captain gets double points
   */
  async calculateWeekScore(
    fantasyTeamId: string,
    weekId: string
  ): Promise<ScoreCalculationResult> {
    // Get snapshot for this week
    const snapshot = await this.snapshotService.getSnapshotForWeek(fantasyTeamId, weekId);
    if (!snapshot) {
      throw new Error(`No snapshot found for fantasy team ${fantasyTeamId} and week ${weekId}`);
    }

    // Get games for this week
    const games = await this.uow.games.findByWeek(weekId);
    if (games.length === 0) {
      // No games yet, return zero score
      return {
        totalPoints: 0,
        captainPoints: 0,
        substitutions: [],
      };
    }

    // Get starting lineup (non-benched players)
    const startingLineup = await this.uow.fantasyTeamSnapshotPlayers.findStartingLineup(snapshot.id);
    
    // Get captain
    const captain = await this.uow.fantasyTeamSnapshotPlayers.findCaptain(snapshot.id);
    if (!captain) {
      throw new Error('No captain found in snapshot');
    }

    let totalPoints = 0;
    let captainPoints = 0;
    const substitutions: Array<{ playerOut: string; playerIn: string; reason: string }> = [];

    // Calculate points for each starting player
    for (const player of startingLineup) {
      // Find stats for this player in games this week
      let pointsForPlayer = 0;
      let playerToScore = player.player_id;
      let wasSubstituted = false;

      for (const game of games) {
        // Check if we need to substitute
        const substitution = await this.applyAutoSubstitution(snapshot.id, player.player_id, game.id);
        
        if (substitution.substituted) {
          playerToScore = substitution.playerId;
          wasSubstituted = true;
          if (substitution.reason) {
            substitutions.push({
              playerOut: player.player_id,
              playerIn: substitution.playerId,
              reason: substitution.reason,
            });
          }
        }

        // Get stats for the player (original or substituted)
        const stats = await this.uow.playerStats.findByPlayerAndGame(playerToScore, game.id);
        if (stats && stats.played) {
          pointsForPlayer += stats.points;
        }
      }

      // Check if this player is the captain
      if (player.is_captain) {
        captainPoints += pointsForPlayer * 2; // Captain gets double
      } else {
        totalPoints += pointsForPlayer;
      }
    }

    return {
      totalPoints,
      captainPoints,
      substitutions,
    };
  }

  /**
   * Calculate and save score for a week
   */
  async calculateAndSaveWeekScore(
    fantasyTeamId: string,
    weekId: string
  ): Promise<InsertFantasyTeamScore> {
    const result = await this.calculateWeekScore(fantasyTeamId, weekId);
    const totalPoints = result.totalPoints + result.captainPoints;

    // Check if score already exists
    const existingScore = await this.uow.getClient()
      .from('fantasy_team_scores')
      .select('*')
      .eq('fantasy_team_id', fantasyTeamId)
      .eq('week_id', weekId)
      .single();

    const scoreData: InsertFantasyTeamScore = {
      fantasy_team_id: fantasyTeamId,
      week_id: weekId,
      total_points: totalPoints,
      captain_points: result.captainPoints,
    };

    if (existingScore.data) {
      // Update existing score
      const { data, error } = await this.uow.getClient()
        .from('fantasy_team_scores')
        .update(scoreData)
        .eq('fantasy_team_id', fantasyTeamId)
        .eq('week_id', weekId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update fantasy team score: ${error.message}`);
      }

      return data as InsertFantasyTeamScore;
    } else {
      // Create new score
      const { data, error } = await this.uow.getClient()
        .from('fantasy_team_scores')
        .insert(scoreData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create fantasy team score: ${error.message}`);
      }

      return data as InsertFantasyTeamScore;
    }
  }

  /**
   * Recalculate all subsequent weeks from a given week
   * Used when stats are corrected retroactively
   */
  async recalculateAllSubsequentWeeks(
    fantasyTeamId: string,
    fromWeekId: string
  ): Promise<void> {
    return this.uow.execute(async (uow) => {
      // Get the from week
      const fromWeek = await uow.weeks.findById(fromWeekId);
      if (!fromWeek) {
        throw new Error('From week not found');
      }

      // Get fantasy team
      const fantasyTeam = await uow.fantasyTeams.findById(fantasyTeamId);
      if (!fantasyTeam) {
        throw new Error('Fantasy team not found');
      }

      // Get all weeks from this week onwards (same season)
      const allWeeks = await uow.weeks.findBySeason(fantasyTeam.season_id);
      const subsequentWeeks = allWeeks
        .filter(w => w.week_number >= fromWeek.week_number)
        .sort((a, b) => a.week_number - b.week_number);

      // Recalculate scores for each subsequent week
      for (const week of subsequentWeeks) {
        // Check if snapshot exists for this week
        const snapshot = await this.snapshotService.getSnapshotForWeek(fantasyTeamId, week.id);
        if (snapshot) {
          // Recalculate and save score
          await this.calculateAndSaveWeekScore(fantasyTeamId, week.id);
        }
      }
    });
  }
}

