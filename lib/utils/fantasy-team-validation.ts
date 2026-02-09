/**
 * Client-side validation utilities for fantasy teams
 * Mirrors server-side validation logic from FantasyTeamSnapshotService
 */

import { FantasyPosition } from '@/lib/domain/types';
import { PlayerWithValue } from '@/lib/api/players.api';

// Team name constraints
const TEAM_NAME_MIN_LENGTH = 1;
const TEAM_NAME_MAX_LENGTH = 50;

/**
 * Validate and sanitize a fantasy team name
 * - Trims whitespace
 * - Validates length (1-50 characters)
 * - Removes control characters
 * @returns The sanitized team name
 * @throws Error if validation fails
 */
export function validateTeamName(name: string): string {
  // Trim whitespace
  const trimmed = name.trim();

  // Check length
  if (trimmed.length < TEAM_NAME_MIN_LENGTH) {
    throw new Error('Team name cannot be empty');
  }

  if (trimmed.length > TEAM_NAME_MAX_LENGTH) {
    throw new Error(`Team name must be ${TEAM_NAME_MAX_LENGTH} characters or less`);
  }

  // Remove control characters (ASCII 0-31 except tab/newline, and DEL 127)
  // eslint-disable-next-line no-control-regex
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // If sanitization changed the string significantly, warn
  if (sanitized !== trimmed) {
    // Just use the sanitized version silently
  }

  // Final length check after sanitization
  if (sanitized.length < TEAM_NAME_MIN_LENGTH) {
    throw new Error('Team name cannot be empty after removing invalid characters');
  }

  return sanitized;
}

export interface LineupValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DraftRosterPlayer {
  playerId: string;
  position: FantasyPosition;
  isBenched: boolean;
  isCaptain: boolean;
}

const SALARY_CAP = 550;

const MAX_PLAYERS_PER_POSITION: Record<FantasyPosition, { starting: number; bench: number }> = {
  handler: { starting: 3, bench: 1 },
  cutter: { starting: 2, bench: 1 },
  receiver: { starting: 2, bench: 1 },
};

/**
 * Validate lineup position constraints
 */
export function validateLineup(
  players: Array<{ position: FantasyPosition; isBenched: boolean; isCaptain?: boolean }>,
  allowPartial: boolean = false
): LineupValidationResult {
  const errors: string[] = [];

  // Only require exactly 10 players if not allowing partial teams
  if (!allowPartial && players.length !== 10) {
    errors.push(`Must have exactly 10 players, found ${players.length}`);
  }

  const counts = {
    handlers: { starting: 0, bench: 0 },
    cutters: { starting: 0, bench: 0 },
    receivers: { starting: 0, bench: 0 },
  };

  const validPositions: FantasyPosition[] = ['handler', 'cutter', 'receiver'];
  const positionToCountsKey: Record<FantasyPosition, keyof typeof counts> = {
    handler: 'handlers',
    cutter: 'cutters',
    receiver: 'receivers',
  };

  for (const player of players) {
    // Validate position exists and is valid
    if (!player.position || typeof player.position !== 'string' || !validPositions.includes(player.position)) {
      errors.push(`Invalid position '${player.position}' for player`);
      continue;
    }

    const countsKey = positionToCountsKey[player.position];
    const positionCounts = counts[countsKey];
    if (!positionCounts) {
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
    if (counts.handlers.starting > MAX_PLAYERS_PER_POSITION.handler.starting) {
      errors.push(`Cannot have more than ${MAX_PLAYERS_PER_POSITION.handler.starting} handlers in starting lineup, found ${counts.handlers.starting}`);
    }
    if (counts.cutters.starting > MAX_PLAYERS_PER_POSITION.cutter.starting) {
      errors.push(`Cannot have more than ${MAX_PLAYERS_PER_POSITION.cutter.starting} cutters in starting lineup, found ${counts.cutters.starting}`);
    }
    if (counts.receivers.starting > MAX_PLAYERS_PER_POSITION.receiver.starting) {
      errors.push(`Cannot have more than ${MAX_PLAYERS_PER_POSITION.receiver.starting} receivers in starting lineup, found ${counts.receivers.starting}`);
    }

    // For partial teams, only check bench maximums
    if (counts.handlers.bench > MAX_PLAYERS_PER_POSITION.handler.bench) {
      errors.push(`Cannot have more than ${MAX_PLAYERS_PER_POSITION.handler.bench} handlers on bench, found ${counts.handlers.bench}`);
    }
    if (counts.cutters.bench > MAX_PLAYERS_PER_POSITION.cutter.bench) {
      errors.push(`Cannot have more than ${MAX_PLAYERS_PER_POSITION.cutter.bench} cutters on bench, found ${counts.cutters.bench}`);
    }
    if (counts.receivers.bench > MAX_PLAYERS_PER_POSITION.receiver.bench) {
      errors.push(`Cannot have more than ${MAX_PLAYERS_PER_POSITION.receiver.bench} receivers on bench, found ${counts.receivers.bench}`);
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

  // Validate captain
  const captains = players.filter(p => p.isCaptain);
  if (captains.length === 0 && !allowPartial && players.length > 0) {
    errors.push('Must have exactly one captain');
  } else if (captains.length > 1) {
    errors.push(`Must have exactly one captain, found ${captains.length}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate salary cap (budget must remain >= 0)
 * @param players - Current roster players
 * @param playersMap - Map of player IDs to player data with values
 * @param currentBudget - Optional: The actual current budget (for week 2+). If not provided, validates against SALARY_CAP.
 */
export function validateSalaryCap(
  players: DraftRosterPlayer[],
  playersMap: Map<string, PlayerWithValue>,
  currentBudget?: number
): LineupValidationResult {
  const errors: string[] = [];

  // If currentBudget is provided (week 2+), just check if it's negative
  // The budget calculation is done elsewhere with proper previous week data
  if (currentBudget !== undefined) {
    if (currentBudget < 0) {
      errors.push(`Team exceeds budget by $${Math.abs(currentBudget).toFixed(0)}k`);
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Week 1: Calculate budget as SALARY_CAP - totalValue
  let totalValue = 0;
  for (const player of players) {
    const playerData = playersMap.get(player.playerId);
    if (playerData) {
      totalValue += playerData.currentValue;
    }
  }

  const budget = SALARY_CAP - totalValue;

  if (budget < 0) {
    errors.push(`Team exceeds budget. Budget remaining: $${budget.toFixed(0)}k / $${SALARY_CAP}k cap`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Combined validation (lineup + salary cap)
 * @param players - Current roster players
 * @param playersMap - Map of player IDs to player data with values
 * @param allowPartial - Allow incomplete rosters
 * @param currentBudget - Optional: The actual current budget (for week 2+). If not provided, validates against SALARY_CAP.
 */
export function validateFantasyTeam(
  players: DraftRosterPlayer[],
  playersMap: Map<string, PlayerWithValue>,
  allowPartial: boolean = false,
  currentBudget?: number
): LineupValidationResult {
  const lineupValidation = validateLineup(players, allowPartial);
  const salaryValidation = validateSalaryCap(players, playersMap, currentBudget);

  return {
    valid: lineupValidation.valid && salaryValidation.valid,
    errors: [...lineupValidation.errors, ...salaryValidation.errors],
  };
}

/**
 * Get max players per position for UI constraints
 */
export function getMaxPlayersPerPosition(): Record<FantasyPosition, { starting: number; bench: number }> {
  return MAX_PLAYERS_PER_POSITION;
}

