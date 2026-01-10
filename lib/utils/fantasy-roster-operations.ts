/**
 * Complex roster manipulation operations
 * These are pure functions that take roster state and return new roster state
 */

import { FantasyPosition } from '@/lib/domain/types';
import { PlayerWithValue } from '@/lib/api/players.api';
import { DraftRosterPlayer, getMaxPlayersPerPosition } from '@/lib/utils/fantasy-team-validation';
import {
  ensureSingleCaptain,
  getFieldPlayersAtPosition,
  getBenchPlayersAtPosition,
  isPositionFull,
} from './fantasy-roster-utils';

/**
 * Add a player to the roster
 * Automatically places player in field or bench based on position limits
 */
export function addPlayerToRoster(
  roster: DraftRosterPlayer[],
  player: PlayerWithValue,
  playersMap: Map<string, PlayerWithValue>
): DraftRosterPlayer[] {
  const playerPosition = player.position as FantasyPosition;
  const maxPlayersPerPosition = getMaxPlayersPerPosition();
  const positionLimits = maxPlayersPerPosition[playerPosition];

  const fieldPlayers = getFieldPlayersAtPosition(roster, playerPosition);
  const benchPlayers = getBenchPlayersAtPosition(roster, playerPosition);

  let newRoster: DraftRosterPlayer[];

  if (fieldPlayers.length >= positionLimits.starting) {
    // Add to bench
    newRoster = [
      ...roster,
      {
        playerId: player.id,
        position: playerPosition,
        isBenched: true,
        isCaptain: false,
      },
    ];
  } else {
    // Add to starting lineup
    newRoster = [
      ...roster,
      {
        playerId: player.id,
        position: playerPosition,
        isBenched: false,
        isCaptain: false,
      },
    ];
  }

  return ensureSingleCaptain(newRoster, playersMap);
}

/**
 * Remove a player from the roster
 */
export function removePlayerFromRoster(
  roster: DraftRosterPlayer[],
  playerId: string
): DraftRosterPlayer[] {
  return roster.filter(p => p.playerId !== playerId);
}

/**
 * Swap two players in the roster (for transfers)
 * Preserves bench/field status and captain status from the player being removed
 */
export function swapPlayersInRoster(
  roster: DraftRosterPlayer[],
  playerIn: PlayerWithValue,
  playerOutId: string,
  playersMap: Map<string, PlayerWithValue>
): DraftRosterPlayer[] {
  const playerPosition = playerIn.position as FantasyPosition;
  const playerOut = roster.find(p => p.playerId === playerOutId);

  const newRoster = roster
    .filter(p => p.playerId !== playerOutId)
    .map(p => ({ ...p }));

  // Add new player in same position (field/bench) as player being removed
  newRoster.push({
    playerId: playerIn.id,
    position: playerPosition,
    isBenched: playerOut?.isBenched ?? false,
    isCaptain: playerOut?.isCaptain ?? false,
  });

  return ensureSingleCaptain(newRoster, playersMap);
}

/**
 * Set captain for a specific player
 */
export function setCaptain(
  roster: DraftRosterPlayer[],
  playerId: string
): DraftRosterPlayer[] {
  return roster.map(p => ({
    ...p,
    isCaptain: p.playerId === playerId,
  }));
}

/**
 * Check if a player is already in the roster
 */
export function isPlayerInRoster(
  roster: DraftRosterPlayer[],
  playerId: string
): boolean {
  return roster.some(p => p.playerId === playerId);
}

/**
 * Get the result of attempting to add a player
 * Returns whether the operation succeeded and any error message
 */
export interface AddPlayerResult {
  success: boolean;
  needsTransfer: boolean;
  error?: string;
}

export function canAddPlayer(
  roster: DraftRosterPlayer[],
  player: PlayerWithValue
): AddPlayerResult {
  const playerPosition = player.position as FantasyPosition;

  if (isPlayerInRoster(roster, player.id)) {
    return {
      success: false,
      needsTransfer: false,
      error: 'Player is already on your team',
    };
  }

  if (isPositionFull(roster, playerPosition)) {
    return {
      success: false,
      needsTransfer: true,
    };
  }

  return {
    success: true,
    needsTransfer: false,
  };
}

