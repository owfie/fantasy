/**
 * Build-time Unit of Work helper
 * Creates a Unit of Work instance for use in static generation (generateStaticParams)
 * This doesn't require cookies and can be used at build time
 */

import { createBuildClient } from '@/lib/supabase/build-client';
import { createUnitOfWork, UnitOfWork } from './unit-of-work';

/**
 * Get a Unit of Work instance for build-time operations
 * Use this in generateStaticParams and other build-time functions
 */
export function getBuildUnitOfWork(): UnitOfWork {
  const client = createBuildClient();
  return createUnitOfWork(client);
}

