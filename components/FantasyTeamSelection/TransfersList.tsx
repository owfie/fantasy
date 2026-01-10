'use client';

import { Transfer } from '@/lib/domain/types';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { Card } from '@/components/Card';
import styles from './TransfersList.module.scss';

interface UnsavedTransfer {
  playerInId: string;
  playerOutId: string;
  id: string;
}

interface TransfersListProps {
  transfers: Transfer[];
  unsavedTransfers?: UnsavedTransfer[];
  players?: Map<string, { firstName: string; lastName: string }>;
}

export function TransfersList({ transfers, unsavedTransfers = [], players }: TransfersListProps) {
  const formatPlayerName = (playerId: string): string => {
    if (players) {
      const player = players.get(playerId);
      if (player) {
        return `${player.firstName.charAt(0)}. ${player.lastName}`;
      }
    }
    return 'Unknown Player';
  };

  const totalTransfers = transfers.length + unsavedTransfers.length;

  return (
    <Card>
      <div className={styles.transfersList}>
        <div className={styles.header}>
        <h3 className={styles.title}>Transfers</h3>
        <div className={styles.count}>{totalTransfers} / 2</div>
      </div>

      {transfers.length === 0 && unsavedTransfers.length === 0 ? (
        <div className={styles.empty}>No transfers made this week</div>
      ) : (
        <div className={styles.transfersTable}>
          <div className={styles.tableHeader}>
            <span className={styles.inColumn}>In</span>
            <span className={styles.outColumn}>Out</span>
            <span className={styles.valueColumn}>Value</span>
            <span className={styles.statusColumn}>Status</span>
          </div>
          {transfers.map(transfer => (
            <div key={transfer.id} className={styles.transferRow}>
              <span className={styles.inColumn}>{formatPlayerName(transfer.player_in_id)}</span>
              <span className={styles.outColumn}>{formatPlayerName(transfer.player_out_id)}</span>
              <span className={`${styles.valueColumn} ${transfer.net_transfer_value >= 0 ? styles.positive : styles.negative}`}>
                {transfer.net_transfer_value >= 0 ? '+' : ''}
                {formatCurrency(transfer.net_transfer_value)}
              </span>
              <span className={styles.statusColumn}></span>
            </div>
          ))}
          {unsavedTransfers.map(transfer => (
            <div key={transfer.id} className={`${styles.transferRow} ${styles.unsavedRow}`}>
              <span className={styles.inColumn}>{formatPlayerName(transfer.playerInId)}</span>
              <span className={styles.outColumn}>{formatPlayerName(transfer.playerOutId)}</span>
              <span className={styles.valueColumn}>—</span>
              <span className={styles.statusColumn}>
                <span className={styles.unsavedBadge}>Unsaved</span>
              </span>
            </div>
          ))}
        </div>
      )}
      </div>
    </Card>
  );
}

