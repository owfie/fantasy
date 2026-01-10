'use client';

import { Transfer } from '@/lib/domain/types';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { Card } from '@/components/Card';
import styles from './TransfersList.module.scss';

interface TransfersListProps {
  transfers: Transfer[];
  players?: Map<string, { firstName: string; lastName: string }>;
}

export function TransfersList({ transfers, players }: TransfersListProps) {
  const formatPlayerName = (playerId: string): string => {
    if (players) {
      const player = players.get(playerId);
      if (player) {
        return `${player.firstName.charAt(0)}. ${player.lastName}`;
      }
    }
    return 'Unknown Player';
  };

  return (
    <Card>
      <div className={styles.transfersList}>
        <div className={styles.header}>
        <h3 className={styles.title}>Transfers</h3>
        <div className={styles.count}>{transfers.length} / 2</div>
      </div>

      {transfers.length === 0 ? (
        <div className={styles.empty}>No transfers made this week</div>
      ) : (
        <div className={styles.transfersTable}>
          <div className={styles.tableHeader}>
            <span className={styles.inColumn}>In</span>
            <span className={styles.outColumn}>Out</span>
            <span className={styles.valueColumn}>Value</span>
          </div>
          {transfers.map(transfer => (
            <div key={transfer.id} className={styles.transferRow}>
              <span className={styles.inColumn}>{formatPlayerName(transfer.player_in_id)}</span>
              <span className={styles.outColumn}>{formatPlayerName(transfer.player_out_id)}</span>
              <span className={`${styles.valueColumn} ${transfer.net_transfer_value >= 0 ? styles.positive : styles.negative}`}>
                {transfer.net_transfer_value >= 0 ? '+' : ''}
                {formatCurrency(transfer.net_transfer_value)}
              </span>
            </div>
          ))}
        </div>
      )}
      </div>
    </Card>
  );
}

