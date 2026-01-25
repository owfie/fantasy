'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import { PlayerDetails } from '@/lib/api/players.api';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { Card } from '@/components/Card';
import styles from './PlayerDetailModal.module.scss';

interface PlayerDetailModalProps {
  playerDetails: PlayerDetails;
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

export default function PlayerDetailModal({ playerDetails }: PlayerDetailModalProps) {
  const router = useRouter();
  const { player, currentValue, startingValue, teamName, teamColor, weeklyAvailability } = playerDetails;
  const fullName = `${player.first_name} ${player.last_name}`;
  const emoji = getTeamEmoji(teamName || '');

  return (
    <Drawer.Root direction="right" open onOpenChange={(isOpen) => {
      if (!isOpen) {
        router.back();
      }
    }}>
      <Drawer.Portal>
        <Drawer.Overlay className={styles.overlay} />
        <Drawer.Content className={styles.content}>
          <div className={styles.header}>
            <Drawer.Title className={styles.title}>{fullName}</Drawer.Title>
            <Drawer.Close className={styles.closeButton} aria-label="Close">
              ×
            </Drawer.Close>
          </div>

          <div className={styles.body}>
            {/* Player Info Card */}
            <Card className={styles.infoCard}>
              <div className={styles.playerInfo}>
                <div className={styles.nameRow}>
                  <span className={styles.emoji}>{emoji}</span>
                  <div>
                    <div className={styles.name}>{fullName}</div>
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
                <h3 className={styles.sectionTitle}>Availability</h3>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
