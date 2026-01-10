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

