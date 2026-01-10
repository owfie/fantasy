'use client';

import { useDroppable } from '@dnd-kit/core';
import { FantasyPosition } from '@/lib/domain/types';
import { getPositionCode } from '@/lib/utils/fantasy-utils';
import { formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { PlayerWithValue } from '@/lib/api/players.api';
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
  onPlayerClick?: (playerId: string) => void;
}

interface DroppablePositionProps {
  player: PitchPlayer | undefined;
  positionCode: string;
  row: string;
  position: FantasyPosition;
  index: number;
  isBench?: boolean;
  onPlayerClick?: (playerId: string) => void;
}

function DroppablePosition({ player, positionCode, row, position, index, isBench = false, onPlayerClick }: DroppablePositionProps) {
  const dropId = isBench ? `bench-${position}-${index}` : `position-${position}-${index}`;
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: {
      position,
      index,
      isBench,
    },
  });

  return (
    <div
      key={player?.playerId || `empty-${row}-${positionCode}`}
      ref={setNodeRef}
      className={`${styles.position} ${isBench ? styles.benchPosition : ''} ${!player ? styles.empty : ''} ${player?.isCaptain ? styles.captain : ''} ${isOver ? styles.dragOver : ''}`}
      onClick={() => player && onPlayerClick?.(player.playerId)}
    >
      {player ? (
        <>
          <div className={styles.positionLabel}>{positionCode}</div>
          {player.player && (
            <>
              <div className={styles.emoji}>{getTeamEmoji(player.player.teamSlug || player.player.teamName)}</div>
              <div className={styles.playerName}>{formatPlayerName(player.player.first_name, player.player.last_name)}</div>
            </>
          )}
        </>
      ) : (
        <div className={styles.positionLabel}>{positionCode}</div>
      )}
    </div>
  );
}

export function PitchFormation({ players, onPlayerClick }: PitchFormationProps) {
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
          <DroppablePosition player={receivers[0]} positionCode="RCV" row="receiver-1" position="receiver" index={0} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={receivers[1]} positionCode="RCV" row="receiver-2" position="receiver" index={1} onPlayerClick={onPlayerClick} />
        </div>

        {/* Cutters Row (2 positions) */}
        <div className={styles.row}>
          <DroppablePosition player={cutters[0]} positionCode="CTR" row="cutter-1" position="cutter" index={0} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={cutters[1]} positionCode="CTR" row="cutter-2" position="cutter" index={1} onPlayerClick={onPlayerClick} />
        </div>

        {/* Handlers Row (3 positions) */}
        <div className={styles.row}>
          <DroppablePosition player={handlers[0]} positionCode="HND" row="handler-1" position="handler" index={0} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={handlers[1]} positionCode="HND" row="handler-2" position="handler" index={1} onPlayerClick={onPlayerClick} />
          <DroppablePosition player={handlers[2]} positionCode="HND" row="handler-3" position="handler" index={2} onPlayerClick={onPlayerClick} />
        </div>
      </div>
      
      {/* Bench Section - below the field */}
      <div className={styles.benchSection}>
        <div className={styles.benchLabel}>BENCH</div>
        <div className={styles.benchPositions}>
          <DroppablePosition player={benchHandlers[0]} positionCode="HND" row="bench-handler-1" position="handler" index={0} isBench onPlayerClick={onPlayerClick} />
          <DroppablePosition player={benchCutters[0]} positionCode="CTR" row="bench-cutter-1" position="cutter" index={0} isBench onPlayerClick={onPlayerClick} />
          <DroppablePosition player={benchReceivers[0]} positionCode="RCV" row="bench-receiver-1" position="receiver" index={0} isBench onPlayerClick={onPlayerClick} />
        </div>
      </div>
    </div>
  );
}

