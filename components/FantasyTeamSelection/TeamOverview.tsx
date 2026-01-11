'use client';

import { memo, useState, useEffect } from 'react';
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
  transfersRemaining: number;
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

function useCountdown(targetTimestamp: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!targetTimestamp) {
      setTimeLeft(null);
      return;
    }

    const targetTime = new Date(targetTimestamp).getTime();

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTimestamp]);

  return timeLeft;
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
  const cutoffTimestamp = week?.transfer_cutoff_time || null;
  const timeLeft = useCountdown(cutoffTimestamp);
  const cutoffDate = cutoffTimestamp ? new Date(cutoffTimestamp) : null;

  const isBeforeCutoff = cutoffDate ? cutoffDate > new Date() : true;
  const showInfinity = isFirstWeek && isBeforeCutoff;
  const transfersMax = showInfinity ? '∞' : '2';

  const formatCountdown = () => {
    if (!timeLeft) return '--:--:--';
    const { days, hours, minutes, seconds } = timeLeft;
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDeadline = () => {
    if (!cutoffDate) return 'No deadline set';
    return cutoffDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const captain = pitchPlayers.find(p => p.isCaptain && !p.isBenched);

  return (
    <div className={styles.teamOverview}>
      {/* Header with Title and Countdown */}
      <div className={styles.header}>
        <h2 className={styles.title}>Squad Selection</h2>
        <div className={styles.deadline}>
          <div className={styles.countdown}>{formatCountdown()}</div>
          <div className={styles.deadlineLabel}>Deadline: {formatDeadline()}</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Players</div>
            <div className={styles.statValue}>
              {playerCount}<span className={styles.statMax}>/{maxPlayers}</span>
            </div>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Budget</div>
            <div className={styles.statValue}>{formatCurrency(salary)}</div>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Transfers</div>
            <div className={styles.statValue}>
              {transfersUsed}<span className={styles.statMax}>/{transfersMax}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Captain Section */}
      {onCaptainClick && (
        <Card className={styles.captainCard}>
          <div className={styles.captainSection}>
            <div className={styles.captainInfo}>
              <div className={styles.captainLabel}>Captain</div>
              <div className={styles.captainName}>
                {captain?.player
                  ? `${captain.player.first_name} ${captain.player.last_name}`
                  : 'Select a captain'}
              </div>
            </div>
            <button className={styles.captainButton} onClick={onCaptainClick}>
              {captain ? 'Change' : 'Select'}
            </button>
          </div>
        </Card>
      )}

      {/* Pitch */}
      <div className={styles.pitchContainer}>
        <PitchFormation
          players={pitchPlayers}
          draggedPlayerPosition={draggedPlayerPosition}
          onPlayerClick={onPlayerClick}
        />
      </div>
    </div>
  );
});

