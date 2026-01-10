'use client';

import { useRouter } from 'next/navigation';
import { useDraggable } from '@dnd-kit/core';
import { PlayerWithValue } from '@/lib/api/players.api';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { formatCurrency, formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamShortName } from '@/lib/utils/team-utils';
import { generateSlug } from '@/lib/utils/slug';
import styles from './PlayerCard.module.scss';

interface PlayerCardProps {
  player: PlayerWithValue;
  onAdd?: (playerId: string) => void;
  isOnTeam?: boolean;
}

export function PlayerCard({ player, onAdd, isOnTeam }: PlayerCardProps) {
  const router = useRouter();
  const emoji = getTeamEmoji(player.teamSlug || player.teamName);
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
  });

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/fantasy/players/${playerSlug}`);
  };

  return (
    <div
      ref={setNodeRef}
      className={`${styles.playerCard} ${isOnTeam ? styles.onTeam : ''} ${isDragging ? styles.dragging : ''}`}
    >
      <div className={styles.dragHandle} {...listeners} {...attributes} title="Drag to position">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ cursor: 'grab' }}
        >
          <circle cx="6" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="10" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="6" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="10" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="6" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="10" cy="12" r="1.5" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
      <div className={styles.emoji}>{emoji}</div>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{displayName}</span>
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
            <span className={styles.positionTag}>{player.position.toUpperCase()}</span>
          )}
        </div>
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.points}>{points}</div>
      <div className={styles.actions}>
        <button 
          className={styles.detailsButton} 
          onClick={handleDetailsClick}
          title="See details"
        >
          View
        </button>
        {onAdd && !isOnTeam && (
          <button className={styles.addButton} onClick={() => onAdd(player.id)}>
            +
          </button>
        )}
      </div>
    </div>
  );
}

