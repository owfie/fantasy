import { getLeaderboardData } from '@/lib/api/fantasy-leaderboard.api';
import { getActiveSeason } from '@/lib/api/seasons.api';
import { FantasyLeaderboard } from '@/components/FantasyLeaderboard';
import { Card } from '@/components/Card';
import styles from './page.module.scss';

export default async function LeaderboardPage() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <div className={styles.container}>
        <Card className={styles.emptyState}>
          <div className={styles.emptyContent}>
            <span className={styles.emptyIcon}>📅</span>
            <h3>No Active Season</h3>
            <p>There is no active season at the moment. Check back later.</p>
          </div>
        </Card>
      </div>
    );
  }

  const data = await getLeaderboardData(season.id);

  return (
    <div className={styles.container}>
      <FantasyLeaderboard data={data} />
    </div>
  );
}
