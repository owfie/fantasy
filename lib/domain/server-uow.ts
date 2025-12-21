/**
 * Server-side Unit of Work helper
 * Creates a Unit of Work instance for use in server components and server actions
 */

import { createClient } from '@/lib/supabase/server';
import { createUnitOfWork, UnitOfWork } from './unit-of-work';

/**
 * Get a Unit of Work instance for server-side operations
 * Use this in server components and server actions
 */
export async function getUnitOfWork(): Promise<UnitOfWork> {
  const client = await createClient();
  return createUnitOfWork(client);
}

