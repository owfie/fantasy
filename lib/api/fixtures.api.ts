/**
 * Fixtures API - Server Actions
 * Thin adapter layer between query hooks and domain repositories
 */

'use server';

import { revalidatePath } from 'next/cache';
import { getUnitOfWork } from '@/lib/domain/server-uow';
import { GamesRepository, GameWithTeams, GameWithDetails } from '@/lib/domain/repositories/games.repository';
import { UpdateGame } from '@/lib/domain/types';

export async function getFixtures(): Promise<GameWithTeams[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.games.findAllWithTeams();
  });
}

export async function getFixture(id: string): Promise<GameWithDetails | null> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.games.findByIdWithDetails(id);
  });
}

export async function updateFixture(data: UpdateGame): Promise<GameWithTeams> {
  const uow = await getUnitOfWork();
  const result = await uow.execute(async () => {
    const updated = await uow.games.update(data);
    
    // Use the optimized method to fetch just this game with teams
    const gameWithTeams = await uow.games.findByIdWithTeams(updated.id);
    if (!gameWithTeams) {
      throw new Error('Failed to fetch updated fixture with teams');
    }
    
    return gameWithTeams;
  });

  // Revalidate the specific fixture page and the fixtures list page
  // This triggers on-demand ISR - the page will be regenerated on next request
  revalidatePath(`/fixtures/${data.id}`);
  revalidatePath('/fixtures');

  return result;
}

