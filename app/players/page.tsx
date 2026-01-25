import type { Metadata } from 'next';
import { getPlayerPrices } from '@/lib/api/players.api';
import { PlayersDirectoryClient } from '@/components/PlayersDirectory';

export const metadata: Metadata = {
  title: 'Players | Adelaide Super League',
  description: 'View all players in the current Adelaide Super League season',
};

export default async function PlayersPage() {
  const players = await getPlayerPrices();

  return <PlayersDirectoryClient players={players} />;
}
