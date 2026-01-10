/**
 * Team emoji mapping for jersey placeholders
 */

export type TeamSlug = 'riptide' | 'flyers' | 'force' | 'titans';

const TEAM_EMOJIS: Record<TeamSlug, string> = {
  riptide: '🔱', // trident
  flyers: '🌊', // wave
  force: '🪽', // wing
  titans: '⚡', // zap
};

/**
 * Get emoji for a team by slug or name
 */
export function getTeamEmoji(teamSlugOrName: string | null | undefined): string {
  if (!teamSlugOrName) return '⚽'; // Default fallback

  const normalized = teamSlugOrName.toLowerCase().trim();
  
  // Direct slug match
  if (normalized in TEAM_EMOJIS) {
    return TEAM_EMOJIS[normalized as TeamSlug];
  }

  // Name-based matching
  if (normalized.includes('riptide')) {
    return TEAM_EMOJIS.riptide;
  }
  if (normalized.includes('flyer')) {
    return TEAM_EMOJIS.flyers;
  }
  if (normalized.includes('force')) {
    return TEAM_EMOJIS.force;
  }
  if (normalized.includes('titan')) {
    return TEAM_EMOJIS.titans;
  }

  return '⚽'; // Default fallback
}

