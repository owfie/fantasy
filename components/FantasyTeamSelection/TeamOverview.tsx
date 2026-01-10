'use client';

import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { UNLIMITED_TRANSFERS } from '@/lib/queries/transfers.queries';
import { Card } from '@/components/Card';
import { PitchFormation } from './PitchFormation';
import styles from './TeamOverview.module.scss';

interface PitchPlayer {
  playerId: string;
  position: 'handler' | 'cutter' | 'receiver';
  isBenched: boolean;
  isCaptain: boolean;
  player?: any;
}

interface TeamOverviewProps {
  transfersUsed: number;
  transfersRemaining: number; // -1 for unlimited
  playerCount: number;
  maxPlayers: number;
  salary: number;
  salaryCap?: number;
  pitchPlayers: PitchPlayer[];
  onPlayerClick?: (playerId: string) => void;
}

export function TeamOverview({
  transfersUsed,
  transfersRemaining,
  playerCount,
  maxPlayers,
  salary,
  salaryCap = 450,
  pitchPlayers,
  onPlayerClick,
}: TeamOverviewProps) {
  const transfersDisplay = transfersRemaining === UNLIMITED_TRANSFERS 
    ? 'Unlimited'
    : `${transfersRemaining}`;
  
  const transfersMax = transfersRemaining === UNLIMITED_TRANSFERS
    ? '∞'
    : '2';

  return (
    <div className={styles.teamOverview}>
      <div className={styles.statsGrid}>
        <Card>
          <div className={styles.stat}>
            <div className={styles.statLabel}>TRANSFERS</div>
            <div className={styles.statValue}>
              {transfersUsed} / {transfersMax}
            </div>
          </div>
        </Card>
        <Card>
          <div className={styles.stat}>
            <div className={styles.statLabel}>PLAYERS</div>
            <div className={styles.statValue}>
              {playerCount} / {maxPlayers}
            </div>
          </div>
        </Card>
        <Card>
          <div className={styles.stat}>
            <div className={styles.statLabel}>SALARY</div>
            <div className={styles.statValue}>
              {formatCurrency(salary)}
            </div>
          </div>
        </Card>
      </div>

      <div className={styles.pitchContainer}>
        <PitchFormation players={pitchPlayers} onPlayerClick={onPlayerClick} />
      </div>
    </div>
  );
}

