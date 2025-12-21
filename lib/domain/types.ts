/**
 * Domain types for the Super League Fantasy application
 * These types match the database schema
 */

export type PlayerRole = 'captain' | 'player' | 'marquee' | 'rookie_marquee' | 'reserve';
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
  color?: string;
  deleted_at?: string;
}

// Player
export interface Player extends BaseEntity {
  team_id?: string;
  first_name: string;
  last_name: string;
  player_role: PlayerRole;
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
}

// Fantasy Team
export interface FantasyTeam extends BaseEntity {
  owner_id: string;
  season_id: string;
  name: string;
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

// Transfer
export interface Transfer extends BaseEntity {
  fantasy_team_id: string;
  player_in_id: string;
  player_out_id: string;
  round: number;
  net_transfer_value: number;
}

// Value Change
export interface ValueChange extends BaseEntity {
  player_id: string;
  round: number;
  value: number;
}

// Insert types (without generated fields)
export type InsertUserProfile = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
export type InsertTeam = Omit<Team, 'id' | 'created_at'>;
export type InsertPlayer = Omit<Player, 'id' | 'created_at' | 'updated_at'>;
export type InsertSeason = Omit<Season, 'id' | 'created_at'>;
export type InsertWeek = Omit<Week, 'id' | 'created_at'>;
export type InsertGame = Omit<Game, 'id' | 'created_at' | 'updated_at'>;
export type InsertFantasyTeam = Omit<FantasyTeam, 'id' | 'created_at' | 'updated_at'>;
export type InsertFantasyTeamPlayer = Omit<FantasyTeamPlayer, 'id' | 'created_at' | 'updated_at' | 'added_at'>;
export type InsertPlayerStats = Omit<PlayerStats, 'id' | 'created_at' | 'updated_at' | 'points'>;
export type InsertFantasyTeamScore = Omit<FantasyTeamScore, 'id' | 'created_at' | 'calculated_at'>;
export type InsertRosterChange = Omit<RosterChange, 'id' | 'created_at'>;
export type InsertPlayerAvailability = Omit<PlayerAvailability, 'id' | 'created_at' | 'updated_at'>;
export type InsertTransfer = Omit<Transfer, 'id' | 'created_at'>;
export type InsertValueChange = Omit<ValueChange, 'id' | 'created_at'>;

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
export type UpdateTransfer = Partial<Omit<Transfer, 'id' | 'created_at'>> & { id: string };
export type UpdateValueChange = Partial<Omit<ValueChange, 'id' | 'created_at'>> & { id: string };


