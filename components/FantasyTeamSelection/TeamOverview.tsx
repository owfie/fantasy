'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { Card } from '@/components/Card';
import { PitchFormation } from './PitchFormation';
import { FantasyPosition, Week } from '@/lib/domain/types';
import styles from './TeamOverview.module.scss';
import Image from 'next/image';
import { getTeamJerseyPath } from '@/lib/utils/team-utils';
import { formatInACST } from '@/lib/utils/date-utils';

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
  salaryCap = 550,
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
    if (!cutoffTimestamp) return 'No deadline set';
    // Format as ACST: Mon 12 Jan at 6pm (ACST)
    const dateStr = formatInACST(cutoffTimestamp, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = formatInACST(cutoffTimestamp, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    return `${dateStr} at ${timeStr} (ACST)`;
  };

  const captain = pitchPlayers.find(p => p.isCaptain && !p.isBenched);

  // assume 6 day transfer window
  const timeRemainingInSeconds = useMemo(() => {
    if (!timeLeft) return 0;
    return timeLeft.days * 24 * 60 * 60 + timeLeft.hours * 60 * 60 + timeLeft.minutes * 60 + timeLeft.seconds;
  }, [timeLeft]);
  const timeRemainingPercent = useMemo(() => timeRemainingInSeconds / (6 * 24 * 60 * 60) * 100, [timeRemainingInSeconds]);

  const captainJerseyPath = useMemo(() => {
    return getTeamJerseyPath(captain?.player?.teamSlug || captain?.player?.teamName) || '';
  }, [captain]);

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

      <div className={styles.topContainer}>
        {/* Stats Row */}
        <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Players</div>
              <div className={`${styles.statValue} ${playerCount !== maxPlayers ? styles.invalid : ''}`}>
                {playerCount}/{maxPlayers}
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Budget</div>
              <div className={`${styles.statValue} ${salary < 0 ? styles.invalid : ''}`}>{formatCurrency(salary)}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Transfers</div>
              <div className={styles.statValueTransparent}>
                {transfersMax === '∞' ? '∞' : `${transfersUsed}/${transfersMax}`}
              </div>
            </div>
        </div>

        {/* Captain Section */}
        {onCaptainClick && (
          <div className={styles.captainCard} onClick={onCaptainClick}>
            <div className={styles.captainSection}>
              {
                captainJerseyPath && (
                  <Image src={captainJerseyPath} alt={captain?.player?.teamName || 'Team jersey'} width={32} height={32} />
                )
              }
              <div className={styles.captainInfo}>
                <div className={styles.captainLabel}>Captain</div>
                <div className={styles.captainName}>
                  {captain?.player
                    ? `${captain.player.first_name} ${captain.player.last_name}`
                    : 'Select a captain'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
              disabled={!hasUnsavedChanges || isSaving || playerCount !== maxPlayers || salary < 0}
              className={styles.saveButton}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
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


