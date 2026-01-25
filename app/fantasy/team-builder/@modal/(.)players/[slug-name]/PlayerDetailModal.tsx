'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import { Player } from '@/lib/domain/types';
import { formatCurrency, formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { getTeamShortName } from '@/lib/utils/team-utils';
import styles from '@/components/FantasyTeamSelection/PlayerDetailDrawer.module.scss';

interface PlayerDetailModalProps {
  player: Player;
}

export default function PlayerDetailModal({ player }: PlayerDetailModalProps) {
  const router = useRouter();
  const fullName = `${player.first_name} ${player.last_name}`;
  const emoji = getTeamEmoji(''); // Will need team data

  const playerWithValue = {
    ...player,
    currentValue: player.starting_value,
    points: 0,
    teamName: undefined,
    teamSlug: undefined,
    teamColor: undefined,
  };

  const teamShortName = getTeamShortName(playerWithValue.teamName, playerWithValue.teamSlug);

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
            <div className={styles.playerInfo}>
              <div className={styles.nameRow}>
                <span className={styles.emoji}>{emoji}</span>
                <div>
                  <div className={styles.name}>{fullName}</div>
                  {player.draft_order && (
                    <div className={styles.draftOrder}>Draft #{player.draft_order}</div>
                  )}
                </div>
              </div>
              
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Position</div>
                  <div className={styles.detailValue}>
                    {player.position ? player.position.toUpperCase() : 'N/A'}
                  </div>
                </div>
                
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Current Value</div>
                  <div className={styles.detailValue}>
                    {formatCurrency(player.starting_value)}
                  </div>
                </div>
                
                {player.starting_value && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Starting Value</div>
                    <div className={styles.detailValue}>
                      {formatCurrency(player.starting_value)}
                    </div>
                  </div>
                )}
                
                {player.player_role && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Role</div>
                    <div className={styles.detailValue}>
                      {player.player_role.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

