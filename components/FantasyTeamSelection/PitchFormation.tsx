'use client';

import { memo } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { FantasyPosition } from '@/lib/domain/types';
import { getPositionCode } from '@/lib/utils/fantasy-utils';
import { formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamJerseyPath } from '@/lib/utils/team-utils';
import { PlayerWithValue } from '@/lib/api/players.api';
import Image from 'next/image';
import styles from './PitchFormation.module.scss';

interface PitchPlayer {
  playerId: string;
  position: FantasyPosition;
  isBenched: boolean;
  isCaptain: boolean;
  player?: PlayerWithValue;
}

interface PitchFormationProps {
  players: PitchPlayer[];
  draggedPlayerPosition?: FantasyPosition | null;
  onPlayerClick?: (playerId: string) => void;
}

interface DroppablePositionProps {
  player: PitchPlayer | undefined;
  positionCode: string;
  row: string;
  position: FantasyPosition;
  index: number;
  isBench?: boolean;
  draggedPlayerPosition?: FantasyPosition | null;
  onPlayerClick?: (playerId: string) => void;
}

function DroppablePosition({ player, positionCode, row, position, index, isBench = false, draggedPlayerPosition, onPlayerClick }: DroppablePositionProps) {
  const dropId = isBench ? `bench-${position}-${index}` : `position-${position}-${index}`;
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: dropId,
    data: {
      position,
      index,
      isBench,
    },
  });

  // Make the position draggable if it contains a player
  const dragId = player ? `position-player-${player.playerId}` : null;
  const { 
    attributes, 
    listeners, 
    setNodeRef: setDragRef, 
    isDragging 
  } = useDraggable({
    id: dragId || `empty-${dropId}`,
    data: {
      type: 'position-player',
      player: player?.player,
      positionPlayer: player, // Include the full position player data
      position,
      index,
      isBench,
      dropId, // Keep reference to original drop zone
    },
    disabled: !player, // Only draggable if it contains a player
  });

  // Combine refs for both drag and drop
  const setNodeRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  // Check if this position can accept the dragged player
  const canDrop = !draggedPlayerPosition || draggedPlayerPosition === position;
  const isDisabled = draggedPlayerPosition !== null && !canDrop;

  const jerseyPath = player?.player ? getTeamJerseyPath(player.player.teamSlug || player.player.teamName) : null;

  return (
    <div
      key={player?.playerId || `empty-${row}-${positionCode}`}
      ref={setNodeRef}
      className={`${styles.position} ${isBench ? styles.benchPosition : ''} ${!player ? styles.empty : ''} ${player?.isCaptain ? styles.captain : ''} ${isOver && !isDisabled ? styles.dragOver : ''} ${isDisabled ? styles.disabled : ''} ${isDragging ? styles.dragging : ''}`}
      onClick={() => player && onPlayerClick?.(player.playerId)}
      {...(player ? { ...attributes, ...listeners } : {})}
      style={player ? { cursor: 'grab' } : undefined}
    >
      {player ? (
        <>
          <div className={styles.positionIndicator}>{positionCode}</div>
          {player.player && (
            <>
              {jerseyPath ? (
                <div className={styles.jerseyContainer}>
                  <Image
                    src={jerseyPath}
                    alt={player.player.teamSlug || player.player.teamName || 'Team jersey'}
                    className={styles.jerseyImage}
                    width={100}
                    height={100}
                  />
                </div>
              ) : (
                <div className={styles.jerseyPlaceholder} />
              )}
              <div className={styles.playerName}>{formatPlayerName(player.player.first_name, player.player.last_name)} {player.isCaptain ? '(c)' : ''}</div>
            </>
          )}
        </>
      ) : (
        <div className={styles.positionLabel}>{positionCode}</div>
      )}
    </div>
  );
}

export const PitchFormation = memo(function PitchFormation({ players, draggedPlayerPosition, onPlayerClick }: PitchFormationProps) {
  const receivers = players.filter(p => p.position === 'receiver' && !p.isBenched);
  const cutters = players.filter(p => p.position === 'cutter' && !p.isBenched);
  const handlers = players.filter(p => p.position === 'handler' && !p.isBenched);
  
  // Bench players
  const benchReceivers = players.filter(p => p.position === 'receiver' && p.isBenched);
  const benchCutters = players.filter(p => p.position === 'cutter' && p.isBenched);
  const benchHandlers = players.filter(p => p.position === 'handler' && p.isBenched);

  return (
    <div className={styles.pitchFormation}>
      <div className={styles.pitch}>
        {/* Top Endzone */}
        <div className={`${styles.endzone} ${styles.top}`} />
        
        {/* Playing Field (3D background) */}
        <div className={styles.playingField}>
          {/* Central X */}
          <div className={styles.brickMark}>✕</div>
          <div className={styles.brickMark}>✕</div>
        </div>
        
        {/* Bottom Endzone */}
        <div className={`${styles.endzone} ${styles.bottom}`} />
      </div>
      
      {/* Position Boxes Overlay - positioned relative to pitchFormation, completely flat on top */}
      <div className={styles.positionOverlay}>
        {/* Receivers Row (2 positions) */}
        <div className={styles.row}>
          <DroppablePosition player={receivers[0]} positionCode="RCV" row="receiver-1" position="receiver" index={0} draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={receivers[1]} positionCode="RCV" row="receiver-2" position="receiver" index={1} draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
        </div>

        {/* Cutters Row (2 positions) */}
        <div className={styles.row}>
          <DroppablePosition player={cutters[0]} positionCode="CTR" row="cutter-1" position="cutter" index={0} draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={cutters[1]} positionCode="CTR" row="cutter-2" position="cutter" index={1} draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
        </div>

        {/* Handlers Row (3 positions) */}
        <div className={styles.row}>
          <DroppablePosition player={handlers[0]} positionCode="HND" row="handler-1" position="handler" index={0} draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={handlers[1]} positionCode="HND" row="handler-2" position="handler" index={1} draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={handlers[2]} positionCode="HND" row="handler-3" position="handler" index={2} draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
        </div>
      </div>
      
      {/* Bench Section - below the field */}
      <div className={styles.benchSection}>
        <div className={styles.benchLabel}>BENCH</div>
        <div className={styles.benchPositions}>
          <DroppablePosition player={benchHandlers[0]} positionCode="HND" row="bench-handler-1" position="handler" index={0} isBench draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={benchCutters[0]} positionCode="CTR" row="bench-cutter-1" position="cutter" index={0} isBench draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={benchReceivers[0]} positionCode="RCV" row="bench-receiver-1" position="receiver" index={0} isBench draggedPlayerPosition={draggedPlayerPosition} onPlayerClick={onPlayerClick} />
        </div>
      </div>
    </div>
  );
});

