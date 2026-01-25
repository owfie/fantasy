'use client';

import Link from 'next/link';
import Image from 'next/image';
import { PlayerWithPrices } from '@/lib/domain/repositories/value-changes.repository';
import { formatCurrency } from '@/lib/utils/fantasy-utils';
import { getTeamJerseyPath } from '@/lib/utils/team-utils';
import { generateSlug } from '@/lib/utils/slug';
import { Card } from '@/components/Card';
import styles from './PlayersDirectory.module.scss';

interface PlayerDirectoryCardProps {
  player: PlayerWithPrices;
  variant?: 'grid' | 'list';
}

export function PlayerDirectoryCard({ player, variant = 'grid' }: PlayerDirectoryCardProps) {
  const playerSlug = generateSlug(`${player.first_name} ${player.last_name}`);
  const displayName = `${player.first_name} ${player.last_name}`;
  const jerseyPath = getTeamJerseyPath(player.team_name || undefined);
  const value = formatCurrency(player.current_value);
  
  const changeValue = player.change ?? 0;
  const changeClass = changeValue > 0 ? styles.positive : changeValue < 0 ? styles.negative : styles.neutral;
  const changeText = changeValue > 0 ? `+${formatCurrency(changeValue)}` : changeValue < 0 ? formatCurrency(changeValue) : '-';

  const cardContent = (
    <>
      <div className={styles.jersey}>
        {jerseyPath ? (
          <Image
            src={jerseyPath}
            alt={player.team_name || 'Team jersey'}
            className={styles.jerseyImage}
            width={48}
            height={48}
          />
        ) : (
          <div className={styles.jerseyPlaceholder}>👤</div>
        )}
      </div>
      
      <div className={styles.playerInfo}>
        <div className={styles.nameRow}>
          <span className={styles.playerName}>{displayName}</span>
        </div>
        <div className={styles.tags}>
          {player.team_name && (
            <span className={styles.teamTag}>
              {player.team_name}
            </span>
          )}
        </div>
      </div>

      <div className={styles.valueSection}>
        <span className={styles.value}>{value}</span>
        <span className={`${styles.valueChange} ${changeClass}`}>
          {changeText}
        </span>
      </div>
    </>
  );

  if (variant === 'grid') {
    return (
      <Link 
        href={`/players/id/${playerSlug}`} 
        scroll={false}
        className={styles.cardLink}
      >
        <Card className={styles.playerCard}>
          {cardContent}
        </Card>
      </Link>
    );
  }

  return (
    <Link 
      href={`/players/id/${playerSlug}`} 
      scroll={false}
      className={styles.listRow}
    >
      {cardContent}
    </Link>
  );
}

