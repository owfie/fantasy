'use client';

import { memo, useState, useEffect, useMemo } from 'react';
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
  onSave?: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  validationErrors?: string[];
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
  onSave,
  onReset,
  isSaving = false,
  hasUnsavedChanges = false,
  validationErrors = [],
}: TeamOverviewProps) {
  const cutoffTimestamp = week?.transfer_cutoff_time || null;
  const timeLeft = useCountdown(cutoffTimestamp);
  const cutoffDate = cutoffTimestamp ? new Date(cutoffTimestamp) : null;

  const isBeforeCutoff = cutoffDate ? cutoffDate > new Date() : true;
  const showInfinity = isFirstWeek && isBeforeCutoff;
  const transfersMax = showInfinity ? '∞' : '2';

  const formatCountdown = () => {
    if (!timeLeft) return '--:--:--:--';

    // if days, hours, minutes, don't show seconds
    // if days is 0, show hours, minutes, seconds

    const { days, hours, minutes, seconds } = timeLeft;
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const formatDeadline = () => {
    if (!cutoffDate) return 'No deadline set';
    // Mon 12 Jan at 6pm (ACST)
    return `${cutoffDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })} at ${cutoffDate.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    })} (ACST)`;
  };

  const captain = pitchPlayers.find(p => p.isCaptain && !p.isBenched);

  // assume 6 day transfer window
  const timeRemainingInSeconds = useMemo(() => {
    if (!timeLeft) return 0;
    return timeLeft.days * 24 * 60 * 60 + timeLeft.hours * 60 * 60 + timeLeft.minutes * 60 + timeLeft.seconds;
  }, [timeLeft]);
  const timeRemainingPercent = useMemo(() => timeRemainingInSeconds / (6 * 24 * 60 * 60) * 100, [timeRemainingInSeconds]);

  return (
    <div className={styles.teamOverview}>
      {/* Header with Title and Countdown */}
      <div className={styles.header}>
        <h2 className={styles.title}>Squad Selection</h2>
      </div>

      {/* Countdown timer */}
      <div className={styles.deadline}>
        <div className={styles.labels}>
            <div className={styles.countdown}>{formatCountdown()}</div>
            <div className={styles.deadlineLabel}>Deadline: <span className={styles.deadlineLabelDate}>{formatDeadline()}</span></div>
        </div>
        <div className={styles.barContainer}>
          <div className={styles.bar} style={{ width: `${timeRemainingPercent}%` }}></div>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Players</div>
            <div className={styles.statValue}>
              {playerCount}/{maxPlayers}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Budget</div>
            <div className={styles.statValue}>{formatCurrency(salary)}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Transfers</div>
            <div className={styles.statValue}>
              {transfersUsed}/{transfersMax}
            </div>
          </div>
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

      {/* Save/Reset Buttons */}
      {(onSave || onReset) && (
        <div className={styles.actionsSection}>
          {onReset && (
            <button
              onClick={onReset}
              className={styles.resetButton}
              disabled={!hasUnsavedChanges}
            >
              Reset
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={!hasUnsavedChanges || isSaving || validationErrors.length > 0}
              className={styles.saveButton}
            >
              {isSaving ? 'Saving...' : 'Save team'}
            </button>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className={styles.validationErrors}>
          <strong>Validation Errors:</strong>
          <ul>
            {validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
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


