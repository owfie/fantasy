/**
 * Build-time repository helpers
 * Direct repository access for static generation (no UoW overhead for read-only operations)
 */

import { createBuildClient } from '@/lib/supabase/build-client';
import { GamesRepository } from './repositories/games.repository';

/**
 * Get a GamesRepository instance for build-time operations
 * Use this in generateStaticParams and static page components
 */
export function getBuildGamesRepository(): GamesRepository {
  const client = createBuildClient();
  return new GamesRepository(client);
}

