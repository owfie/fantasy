/**
 * Team utility functions
 */

/**
 * Get short name for a team from its slug or name
 * Uses slug if available (e.g., "riptide" -> "Riptide")
 * Otherwise extracts last word from name (e.g., "Southside Riptide" -> "Riptide")
 */
export function getTeamShortName(name: string | null | undefined, slug?: string | null): string {
  if (!name && !slug) return '';
  
  // If slug is available, capitalize it
  if (slug) {
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  
  // Otherwise, extract last word from name
  if (name) {
    const words = name.trim().split(/\s+/);
    return words[words.length - 1];
  }
  
  return '';
}

/**
 * Get jersey image path for a team by slug or name
 * Returns the path to the jersey image in /images/jerseys
 */
export function getTeamJerseyPath(teamSlugOrName: string | null | undefined): string | null {
  if (!teamSlugOrName) return null;

  const normalized = teamSlugOrName.toLowerCase().trim();
  
  // Direct slug match
  const validSlugs = ['riptide', 'flyers', 'force', 'titans'];
  for (const slug of validSlugs) {
    if (normalized === slug || normalized.includes(slug)) {
      return `/images/jerseys/${slug}-small.png`;
    }
  }

  return null;
}

