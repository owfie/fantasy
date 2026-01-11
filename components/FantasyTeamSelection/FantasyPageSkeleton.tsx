/**
 * Skeleton loading state for the fantasy page
 * Mimics the structure of the actual page with shimmer effects
 */

import { Card } from '@/components/Card';
import styles from './FantasyPageSkeleton.module.scss';

function HeaderSkeleton() {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={`${styles.shimmer} ${styles.teamName}`} />
        <div className={`${styles.shimmer} ${styles.weekBadge}`} />
      </div>
      <div className={styles.headerRight}>
        <div className={`${styles.shimmer} ${styles.viewToggle}`} />
        <div className={`${styles.shimmer} ${styles.saveButton}`} />
      </div>
    </div>
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
    <Card className={styles.playerListCard}>
      <div className={styles.playerListHeader}>
        <div className={`${styles.shimmer} ${styles.searchBar}`} />
        <div className={styles.positionFilters}>
          <div className={`${styles.shimmer} ${styles.filterButton}`} />
          <div className={`${styles.shimmer} ${styles.filterButton}`} />
          <div className={`${styles.shimmer} ${styles.filterButton}`} />
        </div>
      </div>
      </Card>
      <div className={styles.playerList}>
        {Array.from({ length: 8 }).map((_, i) => (
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

function TeamOverviewSkeleton() {
  return (
    <div className={styles.teamOverview}>
      <StatsSkeleton />
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
      <HeaderSkeleton />
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
