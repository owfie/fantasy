'use client';

import { Card } from '@/components/Card';
import styles from './PlayerCardSkeleton.module.scss';

export function PlayerCardSkeleton() {
  return (
    <Card className={styles.skeletonCard}>
      <div className={styles.skeleton}>
        <div className={`${styles.shimmer} ${styles.dragHandle}`} />
        <div className={`${styles.shimmer} ${styles.jersey}`} />
        <div className={styles.info}>
          <div className={`${styles.shimmer} ${styles.nameRow}`} />
          <div className={styles.tags}>
            <div className={`${styles.shimmer} ${styles.tag}`} />
            <div className={`${styles.shimmer} ${styles.tag}`} />
          </div>
        </div>
        <div className={styles.valueRow}>
          <div className={`${styles.shimmer} ${styles.value}`} />
          <div className={`${styles.shimmer} ${styles.points}`} />
        </div>
      </div>
    </Card>
  );
}


