'use client';

import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { Card } from '@/components/Card';
import styles from './TransfersList.module.scss';
import { ComputedTransfer } from '@/lib/utils/transfer-computation';

interface TransfersListProps {
  transfers: ComputedTransfer[];
  players?: Map<string, { firstName: string; lastName: string; currentValue: number }>;
  onUndoTransfer?: (playerInId: string, playerOutId: string) => void;
  isTransferWindowOpen?: boolean;
  hasUnsavedChanges?: boolean;
  isFirstWeek?: boolean;
}

export function TransfersList({ 
  transfers, 
  players,
  onUndoTransfer,
  isTransferWindowOpen = false,
  hasUnsavedChanges = false,
  isFirstWeek = false,
}: TransfersListProps) {
  const formatPlayerName = (playerId: string): string => {
    if (!playerId) return '—';
    if (players) {
      const player = players.get(playerId);
      if (player) {
        return `${player.firstName.charAt(0)}. ${player.lastName}`;
      }
    }
    return 'Unknown Player';
  };

  const getPlayerPrice = (playerId: string): number | null => {
    if (!playerId) return null;
    if (players) {
      const player = players.get(playerId);
      if (player) {
        return player.currentValue;
      }
    }
    return null;
  };

  const transferCount = transfers.length;
  const isOverLimit = !isFirstWeek && transferCount > 2;

  // In first week, show "swaps" not "transfers" and no limit
  const headerText = isFirstWeek ? 'Squad Changes' : 'Transfers';
  const countDisplay = isFirstWeek ? `${transferCount}` : `${transferCount} / 2`;

  return (
    <Card>
      <div className={styles.transfersList}>
        <div className={styles.header}>
          <h3 className={styles.title}>{headerText}</h3>
          <div className={`${styles.count} ${isOverLimit ? styles.overLimit : ''}`}>
            {countDisplay}
          </div>
        </div>

        {transfers.length === 0 || isFirstWeek ? (
          <div className={styles.empty}>
            {isFirstWeek ? 'Build your squad - no transfer limits' : 'No transfers made this week'}
          </div>
        ) : (
          <div className={styles.transfersTable}>
            <div className={styles.tableHeader}>
              <span className={styles.inColumn}>In</span>
              <span className={styles.priceColumn}>Price</span>
              <span className={styles.outColumn}>Out</span>
              <span className={styles.priceColumn}>Price</span>
              <span className={styles.actionColumn}></span>
            </div>
            {transfers.map(transfer => {
              const playerInPrice = getPlayerPrice(transfer.playerInId);
              const playerOutPrice = getPlayerPrice(transfer.playerOutId);
              return (
                <div 
                  key={transfer.id} 
                  className={`${styles.transferRow} ${hasUnsavedChanges ? styles.pendingRow : ''}`}
                >
                  <span className={styles.inColumn}>{formatPlayerName(transfer.playerInId)}</span>
                  <span className={styles.priceColumn}>
                    {playerInPrice !== null ? formatCurrency(playerInPrice) : '—'}
                  </span>
                  <span className={styles.outColumn}>{formatPlayerName(transfer.playerOutId)}</span>
                  <span className={styles.priceColumn}>
                    {playerOutPrice !== null ? formatCurrency(playerOutPrice) : '—'}
                  </span>
                  <span className={styles.actionColumn}>
                    {hasUnsavedChanges && (
                      <span className={styles.pendingBadge}>Pending</span>
                    )}
                    {isTransferWindowOpen && onUndoTransfer && (
                      <button
                        className={styles.undoButton}
                        onClick={() => onUndoTransfer(transfer.playerInId, transfer.playerOutId)}
                        title="Undo this transfer"
                      >
                        Undo
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isOverLimit && (
          <div className={styles.warningMessage}>
            ⚠️ Over transfer limit! You must undo {transferCount - 2} transfer{transferCount - 2 > 1 ? 's' : ''} before saving.
          </div>
        )}
      </div>
    </Card>
  );
}
