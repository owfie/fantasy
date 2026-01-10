'use client';

import { motion } from 'motion/react';
import { PlayerWithValue } from '@/lib/api/players.api';
import { formatCurrency, formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamShortName, getTeamJerseyPath } from '@/lib/utils/team-utils';
import { Modal } from '@/components/Modal';
import { Card } from '@/components/Card';
import Image from 'next/image';
import styles from './CaptainSelectionModal.module.scss';

interface CaptainSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldPlayers: Array<{ player: PlayerWithValue; playerId: string; isCaptain: boolean }>;
  onSelect: (playerId: string) => void;
}

export function CaptainSelectionModal({
  isOpen,
  onClose,
  fieldPlayers,
  onSelect,
}: CaptainSelectionModalProps) {
  const handleSelect = (playerId: string) => {
    onSelect(playerId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Captain"
      width="600px"
    >
      <div className={styles.captainModal}>
        <p className={styles.description}>
          Select a player from your starting lineup to be your team captain. The captain's points will be doubled.
        </p>
        <div className={styles.playersGrid}>
          {fieldPlayers.map(({ player, playerId, isCaptain }) => {
            const jerseyPath = getTeamJerseyPath(player.teamSlug || player.teamName);
            
            return (
              <div
                key={playerId}
                className={styles.playerCardContainer}
                onClick={() => handleSelect(playerId)}
              >
                <motion.div layoutId={`player-${playerId}`} style={{ width: '100%' }}>
                <Card className={`${styles.playerCard} ${isCaptain ? styles.captain : ''}`}>
                  <div className={styles.jersey}>
                    {jerseyPath ? (
                      <Image
                        src={jerseyPath}
                        alt={getTeamShortName(player.teamName, player.teamSlug) || 'Team jersey'}
                        className={styles.jerseyImage}
                        width={64}
                        height={64}
                      />
                    ) : (
                      <div className={styles.jerseyPlaceholder} />
                    )}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.name}>
                      {formatPlayerName(player.first_name, player.last_name)}
                      {isCaptain && <span className={styles.captainBadge}> (C)</span>}
                    </div>
                    <div className={styles.tags}>
                      {player.teamName && (
                        <span className={styles.teamTag} style={player.teamColor ? { backgroundColor: player.teamColor } : undefined}>
                          {getTeamShortName(player.teamName, player.teamSlug)}
                        </span>
                      )}
                      {player.position && (
                        <span className={styles.positionTag}>
                          {player.position.charAt(0).toUpperCase() + player.position.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.valueRow}>
                    <div className={styles.value}>{formatCurrency(player.currentValue)}</div>
                    <div className={styles.points}>{player.points ?? 0} pts</div>
                  </div>
                </Card>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

