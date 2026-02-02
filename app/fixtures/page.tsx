import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FixturesList } from '@/components/Fixtures/FixturesList';
import { FixturesGroupSkeleton } from '@/components/Fixtures/FixtureCardSkeleton';
import { FixturesFilter, FixtureStatus } from '@/components/Fixtures/FixturesFilter';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Fixtures | Adelaide Super League',
  description: 'View upcoming and past fixtures for Adelaide Super League',
};

interface FixturesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function FixturesPage({ searchParams }: FixturesPageProps) {
  const params = await searchParams;
  const status = (params.status === 'upcoming' || params.status === 'played') 
    ? params.status 
    : 'all';

  return (
    <div className={styles.container}>
      <h1>Fixtures</h1>
      
      <Suspense fallback={null}>
        <FixturesFilter currentStatus={status as FixtureStatus} />
      </Suspense>
      
      <Suspense fallback={<FixturesFallback />}>
        <FixturesList status={status as FixtureStatus} />
      </Suspense>
    </div>
  );
}

function FixturesFallback() {
  return (
    <>
      <FixturesGroupSkeleton cardCount={3} />
      <FixturesGroupSkeleton cardCount={2} />
      <FixturesGroupSkeleton cardCount={3} />
    </>
  );
}
