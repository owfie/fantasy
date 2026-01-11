import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FixturesList } from '@/components/Fixtures/FixturesList';
import { FixturesGroupSkeleton } from '@/components/Fixtures/FixtureCardSkeleton';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Fixtures | Adelaide Super League',
  description: 'View upcoming and past fixtures for Adelaide Super League',
};

export default function FixturesPage() {
  return (
    <div className={styles.container}>
      <h1>Fixtures</h1>
      
      <Suspense fallback={<FixturesFallback />}>
        <FixturesList />
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
