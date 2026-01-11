import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import FixtureDetailClient from './fixture-detail-client';
import { getBuildGamesRepository } from '@/lib/domain/build-repositories';

interface FixturePageProps {
  params: Promise<{ id: string }>;
}

// Use ISR (Incremental Static Regeneration) for fixtures
// Pages are pre-rendered at build time, but can be revalidated when fixtures change
export const dynamic = 'force-static';
export const dynamicParams = false; // Don't generate pages for IDs not in generateStaticParams
export const revalidate = 3600; // Revalidate every hour (3600 seconds) as fallback
// On-demand revalidation is triggered when fixtures are updated via updateFixture()

export async function generateMetadata({ params }: FixturePageProps): Promise<Metadata> {
  const { id } = await params;
  const gamesRepo = getBuildGamesRepository();
  const fixture = await gamesRepo.findByIdWithDetails(id);

  if (!fixture) {
    return {
      title: 'Fixture Not Found | Adelaide Super League',
    };
  }

  const title = fixture.home_team && fixture.away_team
    ? `${fixture.home_team.name} vs ${fixture.away_team.name} | Adelaide Super League`
    : 'Fixture | Adelaide Super League';

  return {
    title,
    description: `View fixture details for ${title.split(' |')[0]} in Adelaide Super League`,
  };
}

export async function generateStaticParams() {
  try {
    // Fetch all fixtures at build time using build-time repository
    const gamesRepo = getBuildGamesRepository();
    const fixtures = await gamesRepo.findAllWithTeams();
    
    return fixtures.map((fixture) => ({
      id: fixture.id,
    }));
  } catch (error) {
    // If fixtures can't be loaded at build time, return empty array
    // Pages will be generated on-demand
    console.error('Failed to generate static params for fixtures:', error);
    return [];
  }
}

export default async function FixturePage({ params }: FixturePageProps) {
  const { id } = await params;
  
  // Use build-time repository for static generation (no cookies needed)
  const gamesRepo = getBuildGamesRepository();
  const fixture = await gamesRepo.findByIdWithDetails(id);

  if (!fixture) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link 
        href="/fixtures" 
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Back to Fixtures
      </Link>
      
      <FixtureDetailClient fixture={fixture} />
    </main>
  );
}

