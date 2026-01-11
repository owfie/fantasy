'use client';

import { memo } from 'react';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { Card } from '@/components/Card';
import { PitchFormation } from './PitchFormation';
import { FantasyPosition, Week } from '@/lib/domain/types';
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
  transfersRemaining: number; // 0 for first week (no transfers), otherwise remaining count
  playerCount: number;
  maxPlayers: number;
  salary: number;
  salaryCap?: number;
  pitchPlayers: PitchPlayer[];
  draggedPlayerPosition?: FantasyPosition | null;
  onPlayerClick?: (playerId: string) => void;
  onCaptainClick?: () => void;
  isFirstWeek?: boolean;
  week?: Week | null;
}

export const TeamOverview = memo(function TeamOverview({
  transfersUsed,
  transfersRemaining,
  playerCount,
  maxPlayers,
  salary,
  salaryCap = 450,
  pitchPlayers,
  draggedPlayerPosition,
  onPlayerClick,
  onCaptainClick,
  isFirstWeek = false,
  week,
}: TeamOverviewProps) {
  // In first week before cutoff, show infinity sign
  const isBeforeCutoff = week?.transfer_cutoff_time 
    ? new Date(week.transfer_cutoff_time) > new Date()
    : true; // If no cutoff time set, assume before cutoff
  
  const showInfinity = isFirstWeek && isBeforeCutoff;
  
  const transfersDisplay = showInfinity ? '∞' : `${transfersRemaining}`;
  const transfersMax = showInfinity ? '∞' : '2';

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
        <PitchFormation 
          players={pitchPlayers} 
          draggedPlayerPosition={draggedPlayerPosition}
          onPlayerClick={onPlayerClick} 
        />
        {onCaptainClick && (
          <div className={styles.captainButtonContainer}>
            <button className={styles.captainButton} onClick={onCaptainClick}>
              Select Captain
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

