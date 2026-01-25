import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTeamBySlug } from '@/lib/api/teams.api';
import { getPlayers } from '@/lib/api/players.api';
import { generateSlug } from '@/lib/utils/slug';
import styles from './page.module.scss';

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);

  if (!team) {
    return {
      title: 'Team Not Found | Adelaide Super League',
    };
  }

  return {
    title: `${team.name} | Adelaide Super League`,
    description: `View team details for ${team.name} in Adelaide Super League`,
  };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);

  if (!team) {
    notFound();
  }

  // Get players on this team
  const allPlayers = await getPlayers();
  const teamPlayers = allPlayers.filter(
    (player) => player.team_id === team.id && player.is_active
  );

  return (
    <main className={styles.container}>
      <Link href="/teams" className={styles.backButton}>
        Back to Teams
      </Link>

      <div className={styles.teamHeader}>
        {team.color && (
          <div
            className={styles.teamColor}
            style={{ backgroundColor: team.color }}
          />
        )}
        <h1 className={styles.teamName}>{team.name}</h1>
      </div>

      <section className={styles.rosterSection}>
        <h2 className={styles.sectionTitle}>Roster</h2>
        {teamPlayers.length > 0 ? (
          <ul className={styles.playerList}>
            {teamPlayers.map((player) => (
              <li key={player.id} className={styles.playerItem}>
                <Link
                  href={`/players/id/${generateSlug(`${player.first_name} ${player.last_name}`)}`}
                  className={styles.playerLink}
                >
                  {player.first_name} {player.last_name}
                </Link>
                {player.position && (
                  <span className={styles.position}>
                    {player.position.toUpperCase()}
                  </span>
                )}
                {player.player_role === 'captain' && (
                  <span className={styles.captain}>Captain</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noPlayers}>No players currently on this team.</p>
        )}
      </section>
    </main>
  );
}
