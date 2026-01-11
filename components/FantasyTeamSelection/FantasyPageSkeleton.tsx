/**
 * Skeleton loading state for the fantasy page
 * Mimics the structure of the actual page with shimmer effects
 */

import { Card } from '@/components/Card';
import styles from './FantasyPageSkeleton.module.scss';

function FantasyTeamCardSkeleton() {
  return (
    <Card className={styles.teamCard}>
      <div className={styles.teamCardContent}>
        <div className={`${styles.shimmer} ${styles.teamCardEmoji}`} />
        <div className={styles.teamCardInfo}>
          <div className={`${styles.shimmer} ${styles.teamCardName}`} />
          <div className={`${styles.shimmer} ${styles.teamCardUsername}`} />
        </div>
      </div>
    </Card>
  );
}

function PlayerCardSkeleton() {
  return (
    <Card className={styles.playerCard}>
      <div className={`${styles.shimmer} ${styles.playerAvatar}`} />
      <div className={styles.playerInfo}>
        <div className={`${styles.shimmer} ${styles.playerName}`} />
        <div className={`${styles.shimmer} ${styles.playerMeta}`} />
      </div>
      <div className={`${styles.shimmer} ${styles.playerValue}`} />
    </Card>
  );
}

function PlayerListSkeleton() {
  return (
    <div className={styles.playerListContainer}>
      {/* Title */}
      <div className={`${styles.shimmer} ${styles.sectionTitle}`} />

      {/* Filters Card */}
      <Card className={styles.filtersCard}>
        <div className={styles.filterGroup}>
          <div className={`${styles.shimmer} ${styles.filterLabel}`} />
          <div className={`${styles.shimmer} ${styles.searchBar}`} />
        </div>
        <div className={styles.filterGroup}>
          <div className={`${styles.shimmer} ${styles.filterLabel}`} />
          <div className={`${styles.shimmer} ${styles.sortSelect}`} />
        </div>
      </Card>

      {/* Position Tabs */}
      <div className={styles.positionTabs}>
        <div className={`${styles.shimmer} ${styles.positionTab}`} />
        <div className={`${styles.shimmer} ${styles.positionTab}`} />
        <div className={`${styles.shimmer} ${styles.positionTab}`} />
        <div className={`${styles.shimmer} ${styles.positionTab}`} />
      </div>

      {/* Player List */}
      <div className={styles.playerList}>
        {Array.from({ length: 6 }).map((_, i) => (
          <PlayerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function PitchSlotSkeleton({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  return (
    <div className={`${styles.pitchSlot} ${size === 'small' ? styles.pitchSlotSmall : ''}`}>
      <div className={`${styles.shimmer} ${styles.pitchSlotInner}`} />
    </div>
  );
}

function PitchSkeleton() {
  return (
    <div className={styles.pitch}>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className={styles.stats}>
      <Card className={styles.statItem}>
        <div className={`${styles.shimmer} ${styles.statLabel}`} />
        <div className={`${styles.shimmer} ${styles.statValue}`} />
      </Card>
      <Card className={styles.statItem}>
        <div className={`${styles.shimmer} ${styles.statLabel}`} />
        <div className={`${styles.shimmer} ${styles.statValue}`} />
      </Card>
      <Card className={styles.statItem}>
        <div className={`${styles.shimmer} ${styles.statLabel}`} />
        <div className={`${styles.shimmer} ${styles.statValue}`} />
      </Card>
    </div>
  );
}

function CaptainSkeleton() {
  return (
    <Card className={styles.captainCard}>
      <div className={styles.captainSection}>
        <div className={styles.captainInfo}>
          <div className={`${styles.shimmer} ${styles.captainLabel}`} />
          <div className={`${styles.shimmer} ${styles.captainName}`} />
        </div>
        <div className={`${styles.shimmer} ${styles.captainButton}`} />
      </div>
    </Card>
  );
}

function TeamOverviewSkeleton() {
  return (
    <div className={styles.teamOverview}>
      {/* Header with Title and Countdown */}
      <div className={styles.overviewHeader}>
        <div className={`${styles.shimmer} ${styles.sectionTitle}`} />
        <div className={styles.deadline}>
          <div className={`${styles.shimmer} ${styles.countdown}`} />
          <div className={`${styles.shimmer} ${styles.deadlineLabel}`} />
        </div>
      </div>

      <StatsSkeleton />
      <CaptainSkeleton />
      
      {/* Actions Section */}
      <div className={styles.actionsSection}>
        <div className={`${styles.shimmer} ${styles.actionButton}`} />
        <div className={`${styles.shimmer} ${styles.actionButton}`} />
      </div>

      <PitchSkeleton />
    </div>
  );
}

function TransfersListSkeleton() {
  return (
    <Card className={styles.transfersCard}>
      <div className={`${styles.shimmer} ${styles.transfersHeader}`} />
      <div className={styles.transfersList}>
        <div className={`${styles.shimmer} ${styles.transferItem}`} />
        <div className={`${styles.shimmer} ${styles.transferItem}`} />
      </div>
    </Card>
  );
}

export function FantasyPageSkeleton({ containerClassName }: { containerClassName?: string }) {
  return (
    <div className={containerClassName}>
      <FantasyTeamCardSkeleton />
      <div className={styles.content}>
        <div className={styles.leftPanel}>
          <PlayerListSkeleton />
        </div>
        <div className={styles.rightPanel}>
          <TeamOverviewSkeleton />
          <TransfersListSkeleton />
        </div>
      </div>
    </div>
  );
}
