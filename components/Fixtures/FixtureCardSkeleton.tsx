import { Card } from '@/components/Card';
import styles from './FixtureCardSkeleton.module.scss';

export function FixtureCardSkeleton() {
  return (
    <Card>
      <div className={styles.skeleton}>
        <div className={styles.matchup}>
          <div className={styles.teams}>
            <div className={`${styles.shimmer} ${styles.teamName}`} />
            <span className={styles.vs}>vs</span>
            <div className={`${styles.shimmer} ${styles.teamName}`} />
          </div>
          <div className={`${styles.shimmer} ${styles.time}`} />
        </div>
        <div className={`${styles.shimmer} ${styles.broadcast}`} />
      </div>
    </Card>
  );
}

export function FixturesGroupSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <div className={styles.group}>
      <div className={`${styles.shimmer} ${styles.dateHeader}`} />
      <div className={styles.deck}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <FixtureCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

