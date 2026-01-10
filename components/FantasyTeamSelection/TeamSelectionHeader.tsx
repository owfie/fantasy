'use client';

import { Week } from '@/lib/domain/types';
import { formatDeadlineDate, calculateTimeRemaining } from '@/lib/utils/date-utils';
import styles from './TeamSelectionHeader.module.scss';

interface TeamSelectionHeaderProps {
  week: Week | null;
  viewMode: 'pitch' | 'list';
  onViewModeChange: (mode: 'pitch' | 'list') => void;
}

export function TeamSelectionHeader({ week, viewMode, onViewModeChange }: TeamSelectionHeaderProps) {
  const deadlineFormatted = week?.transfer_cutoff_time 
    ? formatDeadlineDate(week.transfer_cutoff_time)
    : 'No deadline set';
  
  const timeRemaining = week?.transfer_cutoff_time 
    ? calculateTimeRemaining(week.transfer_cutoff_time)
    : null;

  return (
    <div className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.weekInfo}>
          {week?.name || `Week ${week?.week_number || ''}`}
        </div>
        <div className={styles.deadline}>
          Deadline: {deadlineFormatted}
        </div>
        <div className={styles.countdown}>
          {timeRemaining ? (
            <>Window closes in {timeRemaining.formatted}</>
          ) : (
            'No deadline set'
          )}
        </div>
      </div>
      {/* <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleButton} ${viewMode === 'pitch' ? styles.active : ''}`}
          onClick={() => onViewModeChange('pitch')}
        >
          Pitch View
        </button>
        <button
          className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => onViewModeChange('list')}
        >
          List View
        </button>
      </div> */}
    </div>
  );
}

