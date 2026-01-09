/**
 * Players API - Server Actions
 * Thin adapter layer between query hooks and domain repositories
 */

'use server';

import { getUnitOfWork } from '@/lib/domain/server-uow';
import { PlayerWithPrices } from '@/lib/domain/repositories/value-changes.repository';
import { Player } from '@/lib/domain/types';

/**
 * Get current player prices with previous week comparison
 * Returns all active players with their current value and change from previous round
 */
export async function getPlayerPrices(): Promise<PlayerWithPrices[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.valueChanges.getCurrentPlayerPrices();
  });
}

/**
 * Get player prices for a specific round
 */
export async function getPlayerPricesForRound(round: number): Promise<PlayerWithPrices[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.valueChanges.getPlayerPricesForRound(round);
  });
}

/**
 * Get all players
 */
export async function getPlayers(): Promise<Player[]> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.players.findAll();
  });
}

/**
 * Get a player by ID
 */
export async function getPlayer(id: string): Promise<Player | null> {
  const uow = await getUnitOfWork();
  return uow.execute(async () => {
    return await uow.players.findById(id);
  });
}

