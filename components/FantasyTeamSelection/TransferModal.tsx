'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PlayerWithValue } from '@/lib/api/players.api';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';
import { formatCurrency, formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamShortName, getTeamJerseyPath } from '@/lib/utils/team-utils';
import { Modal } from '@/components/Modal';
import { Card } from '@/components/Card';
import Image from 'next/image';
import styles from './TransferModal.module.scss';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerIn: PlayerWithValue | null;
  swapCandidates: Array<{ player: PlayerWithValue; rosterPlayer: DraftRosterPlayer }>;
  selectedPlayerOutId: string | null;
  onConfirm: (playerInId: string, playerOutId: string) => void;
  title?: string; // Optional title override (defaults to "Transfer")
  confirmButtonText?: string; // Optional confirm button text override (defaults to "Transfer")
}

export function TransferModal({
  isOpen,
  onClose,
  playerIn,
  swapCandidates,
  selectedPlayerOutId: initialSelectedPlayerOutId,
  onConfirm,
  title = 'Transfer',
  confirmButtonText = 'Transfer',
}: TransferModalProps) {
  const [selectedPlayerOutId, setSelectedPlayerOutId] = useState<string | null>(initialSelectedPlayerOutId);

  // Reset selection when modal opens/closes or initial selection changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPlayerOutId(initialSelectedPlayerOutId);
    } else {
      setSelectedPlayerOutId(null);
    }
  }, [isOpen, initialSelectedPlayerOutId]);

  if (!playerIn) {
    return null;
  }

  const handleConfirm = () => {
    if (selectedPlayerOutId) {
      onConfirm(playerIn.id, selectedPlayerOutId);
      setSelectedPlayerOutId(null);
    }
  };

  const handleCancel = () => {
    setSelectedPlayerOutId(null);
    onClose();
  };

  const selectedPlayerOut = swapCandidates.find(c => c.player.id === selectedPlayerOutId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      width="600px"
    >
      <div className={styles.transferModal}>
        {/* Player IN Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>PLAYER IN:</h4>
          <div className={styles.playerCardContainer}>
            <motion.div layoutId={`player-${playerIn.id}`} style={{ width: '100%' }}>
            <Card className={styles.playerCard}>
              <div className={styles.gridIcon}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="4" height="4" fill="currentColor" opacity="0.4" />
                  <rect x="10" y="2" width="4" height="4" fill="currentColor" opacity="0.4" />
                  <rect x="2" y="10" width="4" height="4" fill="currentColor" opacity="0.4" />
                  <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity="0.4" />
                </svg>
              </div>
              <div className={styles.jersey}>
                {(() => {
                  const jerseyPath = getTeamJerseyPath(playerIn.teamSlug || playerIn.teamName);
                  return jerseyPath ? (
                    <Image
                      src={jerseyPath}
                      alt={getTeamShortName(playerIn.teamName, playerIn.teamSlug) || 'Team jersey'}
                      className={styles.jerseyImage}
                      width={64}
                      height={64}
                    />
                  ) : (
                    <div className={styles.jerseyPlaceholder} />
                  );
                })()}
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{formatPlayerName(playerIn.first_name, playerIn.last_name)}</div>
                <div className={styles.tags}>
                  {playerIn.teamName && (
                    <span className={styles.teamTag}>
                      {getTeamShortName(playerIn.teamName, playerIn.teamSlug)}
                    </span>
                  )}
                  {playerIn.position && (
                    <span className={styles.positionTag}>
                      {playerIn.position.charAt(0).toUpperCase() + playerIn.position.slice(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.valueRow}>
                <div className={styles.value}>{formatCurrency(playerIn.currentValue)}</div>
                <div className={styles.points}>{playerIn.points ?? 0} pts</div>
              </div>
            </Card>
            </motion.div>
          </div>
        </div>

        {/* Player OUT Section */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>PLAYER OUT:</h4>
          <div className={styles.swapCandidates}>
            {swapCandidates.map(({ player, rosterPlayer }) => {
              const isSelected = selectedPlayerOutId === player.id;
              const jerseyPath = getTeamJerseyPath(player.teamSlug || player.teamName);
              
              return (
                <div
                  key={player.id}
                  className={styles.playerCardContainer}
                  onClick={() => setSelectedPlayerOutId(player.id)}
                >
                  <motion.div layoutId={`player-${player.id}`} style={{ width: '100%' }}>
                  <Card className={`${styles.playerCard} ${isSelected ? styles.selected : ''}`}>
                    <div className={styles.gridIcon}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="4" height="4" fill="currentColor" opacity="0.4" />
                        <rect x="10" y="2" width="4" height="4" fill="currentColor" opacity="0.4" />
                        <rect x="2" y="10" width="4" height="4" fill="currentColor" opacity="0.4" />
                        <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity="0.4" />
                      </svg>
                    </div>
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
                      <div className={styles.name}>{formatPlayerName(player.first_name, player.last_name)}</div>
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

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={!selectedPlayerOutId}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

