import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPlayerDetailsBySlug } from '@/lib/api/players.api';
import { formatPlayerName, formatCurrency } from '@/lib/utils/fantasy-utils';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { Card } from '@/components/Card';
import styles from './PlayerPage.module.scss';

interface PlayerPageProps {
  params: Promise<{ 'slug-name': string }>;
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { 'slug-name': slugName } = await params;
  const playerDetails = await getPlayerDetailsBySlug(slugName);

  if (!playerDetails) {
    return {
      title: 'Player Not Found | Adelaide Super League',
    };
  }

  const playerName = formatPlayerName(playerDetails.player.first_name, playerDetails.player.last_name);

  return {
    title: `${playerName} | Adelaide Super League`,
    description: `View player details for ${playerName} in Adelaide Super League`,
  };
}

function getAvailabilityDisplay(status: 'available' | 'unavailable' | 'unsure' | null): {
  text: string;
  className: string;
} {
  switch (status) {
    case 'available':
      return { text: 'Yes', className: styles.available };
    case 'unavailable':
      return { text: 'No', className: styles.unavailable };
    case 'unsure':
      return { text: 'Maybe', className: styles.unsure };
    default:
      return { text: '-', className: styles.unknown };
  }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { 'slug-name': slugName } = await params;
  
  const playerDetails = await getPlayerDetailsBySlug(slugName);

  if (!playerDetails) {
    notFound();
  }

  const { player, currentValue, startingValue, teamName, teamColor, weeklyAvailability } = playerDetails;
  const fullName = `${player.first_name} ${player.last_name}`;
  const emoji = getTeamEmoji(teamName || '');

  return (
    <main className={styles.container}>
      <Link 
        href="/players" 
        className={styles.backLink}
      >
        ← Back to Players
      </Link>
      
      <div className={styles.content}>
        {/* Player Info Card */}
        <Card className={styles.infoCard}>
          <div className={styles.playerInfo}>
            <div className={styles.nameRow}>
              <span className={styles.emoji}>{emoji}</span>
              <div>
                <h1 className={styles.name}>{fullName}</h1>
                {teamName && (
                  <div 
                    className={styles.teamBadge}
                    style={teamColor ? { backgroundColor: teamColor } : undefined}
                  >
                    {teamName}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Position</div>
                <div className={styles.detailValue}>
                  {player.position ? player.position.charAt(0).toUpperCase() + player.position.slice(1) : 'N/A'}
                </div>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Current Value</div>
                <div className={styles.detailValue}>
                  {formatCurrency(currentValue)}
                </div>
              </div>

              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Starting Value</div>
                <div className={styles.detailValue}>
                  {formatCurrency(startingValue)}
                </div>
              </div>

              {player.draft_order && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Draft Order</div>
                  <div className={styles.detailValue}>#{player.draft_order}</div>
                </div>
              )}

              {player.player_role && (
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Role</div>
                  <div className={styles.detailValue}>
                    {player.player_role.replace('_', ' ').charAt(0).toUpperCase() + 
                     player.player_role.replace('_', ' ').slice(1)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Availability Table */}
        {weeklyAvailability.length > 0 && (
          <Card className={styles.availabilityCard}>
            <h2 className={styles.sectionTitle}>Availability</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Week</th>
                  <th className={styles.statusColumn}>Status</th>
                </tr>
              </thead>
              <tbody>
                {weeklyAvailability.map((week, index) => {
                  const availability = getAvailabilityDisplay(week.status);
                  const isEven = index % 2 === 1;
                  return (
                    <tr key={week.weekNumber} className={isEven ? styles.evenRow : ''}>
                      <td>{week.weekName}</td>
                      <td className={`${styles.statusColumn} ${availability.className}`}>
                        {availability.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}


