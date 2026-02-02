'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import styles from './FixturesFilter.module.scss';

export type FixtureStatus = 'all' | 'upcoming' | 'played';

interface FixturesFilterProps {
  currentStatus: FixtureStatus;
}

export function FixturesFilter({ currentStatus }: FixturesFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleStatusChange = (status: FixtureStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    const queryString = params.toString();
    router.push(`/fixtures${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterGroup}>
        <button
          className={`${styles.filterButton} ${currentStatus === 'all' ? styles.active : ''}`}
          onClick={() => handleStatusChange('all')}
        >
          All
        </button>
        <button
          className={`${styles.filterButton} ${currentStatus === 'upcoming' ? styles.active : ''}`}
          onClick={() => handleStatusChange('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`${styles.filterButton} ${currentStatus === 'played' ? styles.active : ''}`}
          onClick={() => handleStatusChange('played')}
        >
          Played
        </button>
      </div>
    </div>
  );
}
