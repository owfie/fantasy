'use client';

import styles from './NewsFilters.module.scss';

type FilterType = 'all' | 'opinion' | 'official';

interface NewsFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function NewsFilters({ activeFilter, onFilterChange }: NewsFiltersProps) {
  return (
    <div className={styles.filters}>
      <button
        className={`${styles.filterButton} ${activeFilter === 'all' ? styles.active : ''}`}
        onClick={() => onFilterChange('all')}
      >
        All
      </button>
      <button
        className={`${styles.filterButton} ${activeFilter === 'opinion' ? styles.active : ''}`}
        onClick={() => onFilterChange('opinion')}
      >
        Opinion
      </button>
      <button
        className={`${styles.filterButton} ${activeFilter === 'official' ? styles.active : ''}`}
        onClick={() => onFilterChange('official')}
      >
        Official
      </button>
    </div>
  );
}

