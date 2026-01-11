import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPlayerBySlug } from '@/lib/api/players.api';
import { PlayerDetailContent } from '@/components/FantasyTeamSelection/PlayerDetailContent';

interface PlayerPageProps {
  params: Promise<{ 'slug-name': string }>;
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { 'slug-name': slugName } = await params;
  const player = await getPlayerBySlug(slugName);

  if (!player) {
    return {
      title: 'Player Not Found | Adelaide Super League',
    };
  }

  return {
    title: `${player.name} | Adelaide Super League`,
    description: `View player details for ${player.name} in Adelaide Super League`,
  };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { 'slug-name': slugName } = await params;
  
  const player = await getPlayerBySlug(slugName);

  if (!player) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link 
        href="/fantasy" 
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Back to Fantasy
      </Link>
      
      <PlayerDetailContent player={player} />
    </main>
  );
}

