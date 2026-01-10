'use client';

import { useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import { PlayerWithValue } from '@/lib/api/players.api';
import { formatCurrency, formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { getTeamShortName } from '@/lib/utils/team-utils';
import styles from './PlayerDetailDrawer.module.scss';

interface PlayerDetailDrawerProps {
  player: PlayerWithValue | null;
  open: boolean;
  onClose: () => void;
}

export function PlayerDetailDrawer({ player, open, onClose }: PlayerDetailDrawerProps) {
  const router = useRouter();

  if (!player) return null;

  const displayName = formatPlayerName(player.first_name, player.last_name);
  const fullName = `${player.first_name} ${player.last_name}`;
  const value = formatCurrency(player.currentValue);
  const teamShortName = getTeamShortName(player.teamName, player.teamSlug);
  const emoji = getTeamEmoji(player.teamSlug || player.teamName);

  return (
    <Drawer.Root open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
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
                  <div className={styles.detailLabel}>Team</div>
                  <div className={styles.detailValue}>
                    {teamShortName || player.teamName || 'No team'}
                  </div>
                </div>
                
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Position</div>
                  <div className={styles.detailValue}>
                    {player.position ? player.position.toUpperCase() : 'N/A'}
                  </div>
                </div>
                
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Current Value</div>
                  <div className={styles.detailValue}>{value}</div>
                </div>
                
                {player.starting_value && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Starting Value</div>
                    <div className={styles.detailValue}>
                      {formatCurrency(player.starting_value)}
                    </div>
                  </div>
                )}
                
                {player.points !== undefined && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Total Points</div>
                    <div className={styles.detailValue}>{player.points}</div>
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

