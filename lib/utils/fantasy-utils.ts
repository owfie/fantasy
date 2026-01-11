/**
 * Fantasy team selection utility functions
 */

import { FantasyPosition } from '@/lib/domain/types';

/**
 * Format currency value for display (e.g., "$64 K" or "$550 K")
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0';
  
  if (value >= 1000) {
    const kValue = value / 1000;
    return `$${kValue.toFixed(0)} K`;
  }
  
  return `$${value.toFixed(0)}`;
}

/**
 * Format player name (first initial + last name, e.g., "A. Edgeworth")
 */
export function formatPlayerName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  if (!firstName && !lastName) return 'Unknown Player';
  if (!firstName) return lastName || 'Unknown';
  if (!lastName) return firstName;
  
  const firstInitial = firstName.charAt(0).toUpperCase();
  return `${firstInitial}. ${lastName}`;
}

/**
 * Get display name for fantasy position
 */
export function getPositionDisplayName(position: FantasyPosition): string {
  switch (position) {
    case 'handler':
      return 'Handler';
    case 'cutter':
      return 'Cutter';
    case 'receiver':
      return 'Receiver';
    default:
      return position;
  }
}

/**
 * Get short code for position (for pitch display)
 */
export function getPositionCode(position: FantasyPosition): string {
  switch (position) {
    case 'handler':
      return 'HND';
    case 'cutter':
      return 'CTR';
    case 'receiver':
      return 'RCV';
    default:
      // This should never happen with a properly typed FantasyPosition
      return 'UNK';
  }
}

/**
 * Get expected number of players per position in starting lineup
 */
export function getExpectedPlayersPerPosition(position: FantasyPosition): { starting: number; bench: number } {
  switch (position) {
    case 'handler':
      return { starting: 4, bench: 1 };
    case 'cutter':
      return { starting: 3, bench: 1 };
    case 'receiver':
      return { starting: 3, bench: 1 };
    default:
      return { starting: 0, bench: 0 };
  }
}

