import { Card } from '@/components/Card';
import { LeaderboardData } from '@/lib/api/fantasy-leaderboard.api';
import styles from './index.module.scss';

interface FantasyLeaderboardProps {
  data: LeaderboardData;
}

function formatValue(value: number | null): string {
  if (value === null) return '-';
  return `$${value}k`;
}

function formatPoints(points: number): string {
  // Show one decimal place if needed
  return points % 1 === 0 ? points.toString() : points.toFixed(1);
}

export function FantasyLeaderboard({ data }: FantasyLeaderboardProps) {
  if (data.teams.length === 0) {
    return (
      <Card className={styles.emptyState}>
        <div className={styles.emptyContent}>
          <span className={styles.emptyIcon}>📊</span>
          <h3 className={styles.emptyTitle}>No Teams Yet</h3>
          <p className={styles.emptyText}>Leaderboard will appear once fantasy teams have been created.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.leaderboard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th className={styles.ownerHeader}>Owner</th>
            <th className={styles.valueHeader}>Value</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {data.teams.map((team, index) => {
            const isEven = index % 2 === 1;
            return (
              <tr key={team.teamId} className={isEven ? styles.evenRow : ''}>
                <td className={styles.rank}>{team.rank}</td>
                <td className={styles.team}>
                  <span className={styles.emoji}>{team.emoji}</span>
                  <span className={styles.teamName}>{team.teamName}</span>
                </td>
                <td className={styles.owner}>{team.ownerName || '-'}</td>
                <td className={styles.value}>{formatValue(team.currentValue)}</td>
                <td className={styles.points}>{formatPoints(team.totalPoints)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
