import { getTeamStandings } from '@/lib/api/standings.api';
import { Team, TeamName, toTeamName } from '@/components/Team';
import styles from './TeamStandings.module.scss';
import { Card } from '../Card';

export async function TeamStandings() {
  const standings = await getTeamStandings();

  if (!standings || standings.length === 0) {
    return <p className={styles.empty}>No standings available yet.</p>;
  }

  return (
    <Card className={styles.standings}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Team</th>
            <th className={styles.number}>W</th>
            <th className={styles.number}>L</th>
            <th className={styles.number}>T</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => {
            const teamSlug = toTeamName(standing.team_slug);
            const isEven = index % 2 === 1; // 2nd row (index 1), 4th row (index 3), etc.
            return (
              <tr key={standing.team_id} className={isEven ? styles.evenRow : ''}>
                <td className={styles.teamCell}>
                  {teamSlug && <Team team={teamSlug} size="small" color={standing.team_color} />}
                  <span className={styles.teamName}>{standing.team_name}</span>
                </td>
                <td className={styles.number}>{standing.wins}</td>
                <td className={styles.number}>{standing.losses}</td>
                <td className={styles.number}>{standing.ties}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

