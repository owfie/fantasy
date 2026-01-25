import { notFound } from 'next/navigation';
import { getPlayerDetailsBySlug } from '@/lib/api/players.api';
import PlayerDetailModal from './PlayerDetailModal';

interface InterceptingPlayerPageProps {
  params: Promise<{ 'slug-name': string }>;
}

export default async function InterceptingPlayerPage({ params }: InterceptingPlayerPageProps) {
  const { 'slug-name': slugName } = await params;

  const playerDetails = await getPlayerDetailsBySlug(slugName);

  if (!playerDetails) {
    notFound();
  }

  return <PlayerDetailModal playerDetails={playerDetails} />;
}


