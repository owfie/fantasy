/**
 * Entity Linker Service
 * Builds a lookup map of player and team names to their slug URLs
 * for auto-linking in news articles
 */

import { getPlayers } from '@/lib/api/players.api';
import { getTeams } from '@/lib/api/teams.api';
import { generateSlug } from '@/lib/utils/slug';

export interface LinkableEntity {
  type: 'player' | 'team';
  displayName: string;
  slug: string;
}

/**
 * Build a map of entity names (lowercase) to their link info
 * Sorts patterns longest-first for greedy matching
 */
export async function buildEntityLinkMap(): Promise<Map<string, LinkableEntity>> {
  const entityMap = new Map<string, LinkableEntity>();

  const [players, teams] = await Promise.all([
    getPlayers(),
    getTeams(),
  ]);

  // Track last name occurrences and initial+last name occurrences
  const lastNamePlayers = new Map<string, Array<{ player: typeof players[0]; slug: string }>>();

  // First pass: group players by last name
  for (const player of players) {
    if (!player.is_active) continue;
    const lastNameLower = player.last_name.toLowerCase();
    const fullName = `${player.first_name} ${player.last_name}`;
    const slug = generateSlug(fullName);

    if (!lastNamePlayers.has(lastNameLower)) {
      lastNamePlayers.set(lastNameLower, []);
    }
    lastNamePlayers.get(lastNameLower)!.push({ player, slug });
  }

  // Add players to map
  for (const player of players) {
    if (!player.is_active) continue;

    const fullName = `${player.first_name} ${player.last_name}`;
    const slug = generateSlug(fullName);
    const lastNameLower = player.last_name.toLowerCase();
    const playersWithSameLastName = lastNamePlayers.get(lastNameLower) || [];

    // Always add full name
    entityMap.set(fullName.toLowerCase(), {
      type: 'player',
      displayName: fullName,
      slug,
    });

    if (playersWithSameLastName.length === 1) {
      // Unambiguous last name - add it directly
      entityMap.set(lastNameLower, {
        type: 'player',
        displayName: player.last_name,
        slug,
      });
    } else {
      // Collision: add "X. LastName" pattern (e.g., "S. Davis")
      const initial = player.first_name.charAt(0).toUpperCase();
      const initialPattern = `${initial}. ${player.last_name}`.toLowerCase();

      // Check if initial pattern is also ambiguous (two players with same initial + last name)
      const playersWithSameInitial = playersWithSameLastName.filter(
        p => p.player.first_name.charAt(0).toUpperCase() === initial
      );

      if (playersWithSameInitial.length === 1) {
        entityMap.set(initialPattern, {
          type: 'player',
          displayName: `${initial}. ${player.last_name}`,
          slug,
        });
      }
    }
  }

  // Add teams to map
  for (const team of teams) {
    if (team.deleted_at) continue;

    const teamSlug = team.slug || generateSlug(team.name);

    // Full team name: "West Beach Titans"
    entityMap.set(team.name.toLowerCase(), {
      type: 'team',
      displayName: team.name,
      slug: teamSlug,
    });

    // Parse team name for variations
    // Typically format is "Location TeamName" e.g., "West Beach Titans"
    const nameParts = team.name.split(' ');
    if (nameParts.length >= 2) {
      // Short name (last word): "Titans"
      const shortName = nameParts[nameParts.length - 1];
      const shortNameLower = shortName.toLowerCase();

      // Only add if not already taken (avoid conflicts)
      if (!entityMap.has(shortNameLower)) {
        entityMap.set(shortNameLower, {
          type: 'team',
          displayName: shortName,
          slug: teamSlug,
        });
      }

      // Location (all but last word): "West Beach"
      if (nameParts.length >= 2) {
        const location = nameParts.slice(0, -1).join(' ');
        const locationLower = location.toLowerCase();

        // Only add if not already taken
        if (!entityMap.has(locationLower)) {
          entityMap.set(locationLower, {
            type: 'team',
            displayName: location,
            slug: teamSlug,
          });
        }
      }
    }
  }

  return entityMap;
}

/**
 * Get sorted patterns for matching (longest first for greedy matching)
 */
export function getSortedPatterns(entityMap: Map<string, LinkableEntity>): string[] {
  return Array.from(entityMap.keys()).sort((a, b) => b.length - a.length);
}
