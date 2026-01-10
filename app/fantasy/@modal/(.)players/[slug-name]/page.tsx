import { notFound } from 'next/navigation';
import { getPlayerBySlug } from '@/lib/api/players.api';
import PlayerDetailModal from './PlayerDetailModal';

interface InterceptingPlayerPageProps {
  params: Promise<{ 'slug-name': string }>;
}

export default async function InterceptingPlayerPage({ params }: InterceptingPlayerPageProps) {
  const { 'slug-name': slugName } = await params;
  
  const player = await getPlayerBySlug(slugName);

  if (!player) {
    notFound();
  }

  return <PlayerDetailModal player={player} />;
}

