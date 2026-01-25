'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import Link from 'next/link';
import { Team, Player } from '@/lib/domain/types';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { generateSlug } from '@/lib/utils/slug';
import styles from '@/components/FantasyTeamSelection/PlayerDetailDrawer.module.scss';

interface TeamDetailModalProps {
  team: Team;
  players: Player[];
}

export default function TeamDetailModal({ team, players }: TeamDetailModalProps) {
  const router = useRouter();
  const emoji = getTeamEmoji(team.name);

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
            <Drawer.Title className={styles.title}>{team.name}</Drawer.Title>
            <Drawer.Close className={styles.closeButton} aria-label="Close">
              ×
            </Drawer.Close>
          </div>

          <div className={styles.body}>
            <div className={styles.playerInfo}>
              <div className={styles.nameRow}>
                <span className={styles.emoji}>{emoji}</span>
                <div>
                  <div className={styles.name}>{team.name}</div>
                  {team.color && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      <div
                        style={{
                          width: '0.75rem',
                          height: '0.75rem',
                          borderRadius: '50%',
                          backgroundColor: team.color,
                        }}
                      />
                      <span className={styles.draftOrder}>Team Color</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Roster Size</div>
                  <div className={styles.detailValue}>{players.length} players</div>
                </div>
              </div>

              {players.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div className={styles.detailLabel} style={{ marginBottom: '0.5rem' }}>
                    Players
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {players.map((player) => (
                      <li
                        key={player.id}
                        style={{
                          padding: '0.5rem 0',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        <Link
                          href={`/players/id/${generateSlug(`${player.first_name} ${player.last_name}`)}`}
                          scroll={false}
                          style={{
                            color: '#111827',
                            textDecoration: 'none',
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(`/players/${generateSlug(`${player.first_name} ${player.last_name}`)}`, { scroll: false });
                          }}
                        >
                          {player.first_name} {player.last_name}
                          {player.position && (
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#6b7280',
                              }}
                            >
                              ({player.position.toUpperCase()})
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
