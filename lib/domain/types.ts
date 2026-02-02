/**
 * Domain types for the Super League Fantasy application
 * These types match the database schema
 */

export type PlayerRole = 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve';
export type FantasyPosition = 'handler' | 'cutter' | 'receiver';
export type AvailabilityStatus = 'available' | 'unavailable' | 'unsure';

// Base entity interface
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// User Profile
export interface UserProfile extends BaseEntity {
  email: string;
  display_name?: string;
  is_admin: boolean;
}

// Team
export interface Team extends BaseEntity {
  name: string;
  slug?: string;
  color?: string;
  deleted_at?: string;
}

// Player
export interface Player extends BaseEntity {
  team_id?: string;
  first_name: string;
  last_name: string;
  player_role: PlayerRole;
  position?: FantasyPosition; // Fantasy position (handler/cutter/receiver)
  starting_value: number;
  draft_order?: number;
  is_active: boolean;
}

// Season
export interface Season extends BaseEntity {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// Week
export interface Week extends BaseEntity {
  season_id: string;
  week_number: number;
  name?: string;
  start_date?: string;
  end_date?: string;
  is_draft_week: boolean;
  transfer_window_open: boolean;
  transfer_cutoff_time?: string;
  prices_calculated: boolean;
  transfer_window_closed_at?: string; // Timestamp when window was closed (to distinguish completed from ready)
}

// Game
export interface Game extends BaseEntity {
  week_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_time?: string;
  is_completed: boolean;
  home_score?: number;
  away_score?: number;
  broadcast_link?: string;
}

// Fantasy Team
export interface FantasyTeam extends BaseEntity {
  owner_id: string;
  season_id: string;
  name: string;
  emoji?: string; // Optional - defaults to '🏆' in database
  original_value: number;
  total_value: number;
}

// Fantasy Team Player
export interface FantasyTeamPlayer extends BaseEntity {
  fantasy_team_id: string;
  player_id: string;
  draft_round?: number;
  draft_pick?: number;
  is_captain: boolean;
  is_reserve: boolean;
  is_active: boolean;
  added_at: string;
}

// Player Stats
export interface PlayerStats extends BaseEntity {
  player_id: string;
  game_id: string;
  goals: number;
  assists: number;
  blocks: number;
  drops: number;
  throwaways: number;
  points: number; // Calculated field
  played: boolean;
  entered_by?: string;
}

// Fantasy Team Score
export interface FantasyTeamScore extends BaseEntity {
  fantasy_team_id: string;
  week_id: string;
  total_points: number;
  captain_points: number;
  calculated_at: string;
}

// Roster Change
export interface RosterChange extends BaseEntity {
  fantasy_team_id: string;
  week_id: string;
  player_out_id: string;
  player_in_id: string;
  reason?: string;
  notes?: string;
  created_by?: string;
}

// Player Availability
export interface PlayerAvailability extends BaseEntity {
  player_id: string;
  game_id: string;
  status: AvailabilityStatus;
  confirmed_by?: string;
  notes?: string;
}

// Fantasy Team Snapshot
export interface FantasyTeamSnapshot extends BaseEntity {
  fantasy_team_id: string;
  week_id: string;
  captain_player_id?: string;
  total_value: number;
  budget_remaining: number;
  snapshot_created_at: string;
}

// Fantasy Team Snapshot Player
export interface FantasyTeamSnapshotPlayer extends BaseEntity {
  snapshot_id: string;
  player_id: string;
  position: FantasyPosition;
  is_benched: boolean;
  is_captain: boolean;
  player_value_at_snapshot: number;
}

// Transfer
export interface Transfer extends BaseEntity {
  fantasy_team_id: string;
  player_in_id: string;
  player_out_id: string;
  round?: number; // Kept for backward compatibility
  week_id?: string; // New field
  net_transfer_value: number;
}

// Value Change
export interface ValueChange extends BaseEntity {
  player_id: string;
  round: number;
  value: number;
}

// Season Player (junction table - tracks player's team per season)
export interface SeasonPlayer extends BaseEntity {
  season_id: string;
  player_id: string;
  team_id?: string;  // The team the player played for in this season
  starting_value: number;
  is_active: boolean;
}

// Article Author
export interface ArticleAuthor extends BaseEntity {
  name: string;
  bio?: string;
  avatar_url?: string;
}

// Article Tag
export interface ArticleTag extends BaseEntity {
  name: string;
  slug: string;
}

// Article (metadata only, content in markdown files)
export interface Article extends BaseEntity {
  slug: string;
  title: string;
  description?: string;
  author_id?: string;
  header_image_url?: string;
  published_at?: string;
}

// Insert types (without generated fields)
export type InsertUserProfile = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
export type InsertTeam = Omit<Team, 'id' | 'created_at'>;
export type InsertPlayer = Omit<Player, 'id' | 'created_at' | 'updated_at'>;
export type InsertSeason = Omit<Season, 'id' | 'created_at'>;
export type InsertWeek = Omit<Week, 'id' | 'created_at' | 'transfer_window_open' | 'transfer_cutoff_time' | 'prices_calculated' | 'transfer_window_closed_at'> & {
  transfer_window_open?: boolean;
  transfer_cutoff_time?: string | null;
  prices_calculated?: boolean;
  transfer_window_closed_at?: string | null;
};
export type InsertGame = Omit<Game, 'id' | 'created_at' | 'updated_at'>;
export type InsertFantasyTeam = Omit<FantasyTeam, 'id' | 'created_at' | 'updated_at'>;
export type InsertFantasyTeamPlayer = Omit<FantasyTeamPlayer, 'id' | 'created_at' | 'updated_at' | 'added_at'>;
export type InsertPlayerStats = Omit<PlayerStats, 'id' | 'created_at' | 'updated_at' | 'points'>;
export type InsertFantasyTeamScore = Omit<FantasyTeamScore, 'id' | 'created_at' | 'calculated_at'>;
export type InsertRosterChange = Omit<RosterChange, 'id' | 'created_at'>;
export type InsertPlayerAvailability = Omit<PlayerAvailability, 'id' | 'created_at' | 'updated_at'>;
export type InsertFantasyTeamSnapshot = Omit<FantasyTeamSnapshot, 'id' | 'created_at' | 'snapshot_created_at'>;
export type InsertFantasyTeamSnapshotPlayer = Omit<FantasyTeamSnapshotPlayer, 'id' | 'created_at' | 'updated_at'>;
export type InsertTransfer = Omit<Transfer, 'id' | 'created_at'>;
export type InsertValueChange = Omit<ValueChange, 'id' | 'created_at'>;
export type InsertSeasonPlayer = Omit<SeasonPlayer, 'id' | 'created_at' | 'updated_at'>;
export type InsertArticleAuthor = Omit<ArticleAuthor, 'id' | 'created_at'>;
export type InsertArticleTag = Omit<ArticleTag, 'id' | 'created_at'>;
export type InsertArticle = Omit<Article, 'id' | 'created_at' | 'updated_at'>;

// Transfer Window Status (for price calculation UI)
export interface TransferWindowStatus {
  windowNumber: number;           // 0, 1, 2, 3, etc.
  correspondingWeekNumber: number; // 0 for TW0 (none), 1 for TW1, 2 for TW2, etc.
  hasRequiredStats: boolean;       // Can we calculate this window? (TW0 always true)
  isCalculated: boolean;           // Have prices been saved? (TW0 always true - starting prices)
  canCalculate: boolean;           // hasRequiredStats && windowNumber >= 1
  pricesCalculated: boolean;       // Is prices_calculated flag set on the week?
  transferWindowOpen: boolean;     // Is transfer window currently open?
  cutoffTime?: string;             // Transfer cutoff time (for derived completed state)
  closedAt?: string;               // Timestamp when window was manually closed
  weekId?: string;                 // The week ID (undefined for TW0)
  weekEndDate?: string;            // End date of the week (for determining if week is in the past)
}

// Transfer Window Effective State (derived from pricesCalculated + transferWindowOpen + cutoff/closedAt)
export type TransferWindowState = 'upcoming' | 'ready' | 'open' | 'completed';

/**
 * Derive the transfer window state from its properties
 *
 * States:
 * - upcoming: prices not calculated yet, window not open
 * - ready: prices calculated, window never opened (ready for admin review)
 * - open: prices calculated, window currently open AND before cutoff (users can transfer)
 * - completed: window was opened and either manually closed OR cutoff time has passed OR week has ended
 */
export function getTransferWindowState(
  pricesCalculated: boolean,
  transferWindowOpen: boolean,
  cutoffTime?: string,
  closedAt?: string,
  weekEndDate?: string
): TransferWindowState {
  if (!pricesCalculated && !transferWindowOpen) return 'upcoming';

  if (pricesCalculated && !transferWindowOpen) {
    // Was it ever opened? Check if closedAt exists
    if (closedAt) return 'completed'; // Was opened, manually closed
    // Check if week has ended (past weeks are effectively completed)
    if (weekEndDate && new Date(weekEndDate) < new Date()) {
      return 'completed'; // Week is in the past
    }
    return 'ready'; // Never opened, week not yet ended
  }

  if (pricesCalculated && transferWindowOpen) {
    // Check if cutoff time has passed (derived completed state)
    if (cutoffTime && new Date(cutoffTime) < new Date()) {
      return 'completed'; // Cutoff passed, effectively closed
    }
    return 'open';
  }

  // transferWindowOpen && !pricesCalculated is invalid - service layer prevents this
  return 'upcoming';
}

// Update types (partial, with id required)
export type UpdateTeam = Partial<Omit<Team, 'id' | 'created_at'>> & { id: string };
export type UpdatePlayer = Partial<Omit<Player, 'id' | 'created_at'>> & { id: string };
export type UpdateSeason = Partial<Omit<Season, 'id' | 'created_at'>> & { id: string };
export type UpdateWeek = Partial<Omit<Week, 'id' | 'created_at'>> & { id: string };
export type UpdateGame = Partial<Omit<Game, 'id' | 'created_at'>> & { id: string };
export type UpdateFantasyTeam = Partial<Omit<FantasyTeam, 'id' | 'created_at'>> & { id: string };
export type UpdateFantasyTeamPlayer = Partial<Omit<FantasyTeamPlayer, 'id' | 'created_at' | 'added_at'>> & { id: string };
export type UpdatePlayerStats = Partial<Omit<PlayerStats, 'id' | 'created_at' | 'points'>> & { id: string };
export type UpdateRosterChange = Partial<Omit<RosterChange, 'id' | 'created_at'>> & { id: string };
export type UpdatePlayerAvailability = Partial<Omit<PlayerAvailability, 'id' | 'created_at'>> & { id: string };
export type UpdateFantasyTeamSnapshot = Partial<Omit<FantasyTeamSnapshot, 'id' | 'created_at' | 'snapshot_created_at'>> & { id: string };
export type UpdateFantasyTeamSnapshotPlayer = Partial<Omit<FantasyTeamSnapshotPlayer, 'id' | 'created_at' | 'updated_at'>> & { id: string };
export type UpdateTransfer = Partial<Omit<Transfer, 'id' | 'created_at'>> & { id: string };
export type UpdateValueChange = Partial<Omit<ValueChange, 'id' | 'created_at'>> & { id: string };
export type UpdateSeasonPlayer = Partial<Omit<SeasonPlayer, 'id' | 'created_at' | 'updated_at'>> & { id: string };
export type UpdateArticleAuthor = Partial<Omit<ArticleAuthor, 'id' | 'created_at'>> & { id: string };
export type UpdateArticleTag = Partial<Omit<ArticleTag, 'id' | 'created_at'>> & { id: string };
export type UpdateArticle = Partial<Omit<Article, 'id' | 'created_at'>> & { id: string };


