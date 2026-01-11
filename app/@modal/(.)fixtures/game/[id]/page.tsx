import { notFound } from 'next/navigation';
import FixtureDetailClient from '../../../../fixtures/game/[id]/fixture-detail-client';
import { getBuildGamesRepository } from '@/lib/domain/build-repositories';

interface InterceptingFixturePageProps {
  params: Promise<{ id: string }>;
}

export default async function InterceptingFixturePage({ params }: InterceptingFixturePageProps) {
  const { id } = await params;
  
  // Use build-time repository for static generation (no cookies needed)
  const gamesRepo = getBuildGamesRepository();
  const fixture = await gamesRepo.findByIdWithDetails(id);

  if (!fixture) {
    notFound();
  }

  return (
    <>
      <FixtureDetailClient fixture={fixture} />
    </>
  );
}

