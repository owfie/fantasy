'use client';

import { useRouter } from 'next/navigation';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'motion/react';
import { PlayerWithValue } from '@/lib/api/players.api';
import { formatCurrency, formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamShortName, getTeamJerseyPath } from '@/lib/utils/team-utils';
import { generateSlug } from '@/lib/utils/slug';
import styles from './PlayerCard.module.scss';
import { Card } from '../Card';
import Image from 'next/image';
import Link from 'next/link';

interface PlayerCardProps {
  player: PlayerWithValue;
  onAdd?: (playerId: string) => void;
  onSwap?: (playerId: string) => void;
  isOnTeam?: boolean;
  canAdd?: boolean;
  layoutId?: string;
}

export function PlayerCard({ player, onAdd, onSwap, isOnTeam, canAdd = true, layoutId }: PlayerCardProps) {
  const router = useRouter();
  const jerseyPath = getTeamJerseyPath(player.teamSlug || player.teamName);
  const displayName = formatPlayerName(player.first_name, player.last_name);
  const value = formatCurrency(player.currentValue);
  const points = player.points ?? 0;
  const teamShortName = getTeamShortName(player.teamName, player.teamSlug);
  const playerSlug = generateSlug(`${player.first_name} ${player.last_name}`);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: {
      player,
      type: 'player',
    },
    disabled: isOnTeam, // Disable dragging if player is already on the team
  });

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/fantasy/players/${playerSlug}`);
  };

  const cardElement = (
    <Card className={`${styles.playerCard} ${isOnTeam ? styles.onTeam : ''} ${isDragging ? styles.dragging : ''}`}>
      <div 
        className={styles.dragHandle} 
        {...(!isOnTeam ? { ...listeners, ...attributes } : {})} 
        title={isOnTeam ? undefined : "Drag to position"}
        style={isOnTeam ? { cursor: 'default' } : undefined}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ cursor: isOnTeam ? 'default' : 'grab' }}
        >
          <circle cx="6" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="10" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="6" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="10" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="6" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="10" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
      <div className={styles.jersey}>
        {jerseyPath ? (
          <Image
            src={jerseyPath}
            alt={teamShortName || 'Team jersey'}
            className={styles.jerseyImage}
            width={64}
            height={64}
          />
        ) : (
          <div />
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <Link href={`/players/id/${playerSlug}`} scroll={false} className={styles.detailsButton}>
            <span className={styles.name}>{displayName}</span>
          </Link>
          {player.draft_order && (
            <span className={styles.draftOrder}>Draft #{player.draft_order}</span>
          )}
        </div>
        <div className={styles.tags}>
          {teamShortName && (
            <span 
              className={styles.teamTag}
              style={player.teamColor ? { backgroundColor: player.teamColor } : undefined}
            >
              {teamShortName}
            </span>
          )}
          {player.position && (
            <span className={styles.positionTag}>{player.position.charAt(0).toUpperCase() + player.position.slice(1)}</span>
          )}
        </div>
      </div>
      <div className={styles.valueRow}>
        <div className={styles.value}>{value}</div>
        <div className={styles.points}>{points} pts</div>
        <div className={styles.actions}>
          {(!isOnTeam && (onAdd || onSwap)) ? (
            <button
              className={canAdd ? styles.addButton : styles.swapButton}
              onClick={() => {
                if (canAdd && onAdd) {
                  onAdd(player.id);
                } else if (!canAdd && onSwap) {
                  onSwap(player.id);
                }
              }}
              title={canAdd ? 'Add player' : 'Swap player'}
            >
              {canAdd ? '+' : '↔'}
            </button>
          ) : (
            <div style={{ width: '2rem', height: '2rem' }} />
          )}
        </div>  
      </div>
    </Card>
  );

  // Wrap in motion.div if layoutId is provided for shared layout animations
  if (layoutId) {
    return (
      <motion.div layoutId={layoutId} ref={setNodeRef}>
        {cardElement}
      </motion.div>
    );
  }

  return (
    <div ref={setNodeRef}>
      {cardElement}
    </div>
  );
}

