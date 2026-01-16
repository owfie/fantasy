/**
 * Utility functions for fantasy roster operations
 */

import { FantasyPosition } from '@/lib/domain/types';
import { PlayerWithValue } from '@/lib/api/players.api';
import { DraftRosterPlayer, getMaxPlayersPerPosition } from '@/lib/utils/fantasy-team-validation';

/**
 * Ensures exactly one captain in the roster.
 * If no captain exists, assigns the highest value player as captain.
 * If multiple captains exist, keeps only the highest value one.
 */
export function ensureSingleCaptain(
  roster: DraftRosterPlayer[],
  playersMap: Map<string, PlayerWithValue>
): DraftRosterPlayer[] {
  const captains = roster.filter(p => p.isCaptain);
  
  if (captains.length === 0 && roster.length > 0) {
    // No captain - assign highest value player
    const playersWithValues = roster.map((p, idx) => ({
      ...p,
      idx,
      value: playersMap.get(p.playerId)?.currentValue || 0,
    }));
    playersWithValues.sort((a, b) => b.value - a.value);
    
    if (playersWithValues[0]) {
      const newRoster = roster.map((p, idx) => ({
        ...p,
        isCaptain: idx === playersWithValues[0].idx,
      }));
      return newRoster;
    }
  } else if (captains.length > 1) {
    // Multiple captains - keep only highest value
    const captainsWithValues = captains.map(p => ({
      ...p,
      value: playersMap.get(p.playerId)?.currentValue || 0,
    }));
    captainsWithValues.sort((a, b) => b.value - a.value);
    const captainToKeep = captainsWithValues[0].playerId;
    
    return roster.map(p => ({
      ...p,
      isCaptain: p.playerId === captainToKeep,
    }));
  }
  
  return roster;
}

/**
 * Calculate total salary from roster
 */
export function calculateRosterSalary(
  roster: DraftRosterPlayer[],
  playersMap: Map<string, PlayerWithValue>
): number {
  let total = 0;
  for (const player of roster) {
    const playerData = playersMap.get(player.playerId);
    if (playerData) {
      total += playerData.currentValue;
    }
  }
  return total;
}

/**
 * Parse drop zone ID to extract position and slot information
 * Returns null if the drop zone ID format is invalid
 */
export function parseDropZoneId(
  dropZoneId: string
): { targetPosition: FantasyPosition; slotIndex: number; isBench: boolean } | null {
  const fieldMatch = dropZoneId.match(/^position-(handler|cutter|receiver)-(\d+)$/);
  const benchMatch = dropZoneId.match(/^bench-(handler|cutter|receiver)-(\d+)$/);
  
  if (!fieldMatch && !benchMatch) {
    return null;
  }
  
  const match = fieldMatch || benchMatch;
  const isBench = !!benchMatch;
  const [, targetPosition, slotIndexStr] = match!;
  const slotIndex = parseInt(slotIndexStr, 10);
  
  return {
    targetPosition: targetPosition as FantasyPosition,
    slotIndex,
    isBench,
  };
}

/**
 * Get all players at a specific position from roster
 */
export function getPositionPlayers(
  roster: DraftRosterPlayer[],
  position: FantasyPosition
): DraftRosterPlayer[] {
  return roster.filter(p => p.position === position);
}

/**
 * Get field players at a specific position
 */
export function getFieldPlayersAtPosition(
  roster: DraftRosterPlayer[],
  position: FantasyPosition
): DraftRosterPlayer[] {
  return roster.filter(p => p.position === position && !p.isBenched);
}

/**
 * Get bench players at a specific position
 */
export function getBenchPlayersAtPosition(
  roster: DraftRosterPlayer[],
  position: FantasyPosition
): DraftRosterPlayer[] {
  return roster.filter(p => p.position === position && p.isBenched);
}

/**
 * Check if position slots are full (both field and bench)
 */
export function isPositionFull(
  roster: DraftRosterPlayer[],
  position: FantasyPosition
): boolean {
  const maxPlayersPerPosition = getMaxPlayersPerPosition();
  const positionLimits = maxPlayersPerPosition[position];
  
  const fieldPlayers = getFieldPlayersAtPosition(roster, position);
  const benchPlayers = getBenchPlayersAtPosition(roster, position);
  
  return (
    fieldPlayers.length >= positionLimits.starting &&
    benchPlayers.length >= positionLimits.bench
  );
}

/**
 * Create a map of player IDs to player name and value data
 */
export function createPlayersMap(
  players: PlayerWithValue[]
): Map<string, { firstName: string; lastName: string; currentValue: number }> {
  const map = new Map<string, { firstName: string; lastName: string; currentValue: number }>();
  players.forEach(p => {
    map.set(p.id, { firstName: p.first_name, lastName: p.last_name, currentValue: p.currentValue });
  });
  return map;
}

/**
 * Create a map of player IDs to full PlayerWithValue objects
 */
export function createPlayersValueMap(
  players: PlayerWithValue[]
): Map<string, PlayerWithValue> {
  const map = new Map<string, PlayerWithValue>();
  players.forEach(p => {
    map.set(p.id, p);
  });
  return map;
}

/**
 * Get swap candidates for a position (players currently at that position)
 */
export function getSwapCandidates(
  roster: DraftRosterPlayer[],
  position: FantasyPosition,
  players: PlayerWithValue[]
): Array<{ player: PlayerWithValue; rosterPlayer: DraftRosterPlayer }> {
  return roster
    .filter(p => p.position === position)
    .map(rosterPlayer => {
      const player = players.find(p => p.id === rosterPlayer.playerId);
      return player ? { player, rosterPlayer } : null;
    })
    .filter((item): item is { player: PlayerWithValue; rosterPlayer: DraftRosterPlayer } => item !== null);
}

