/**
 * Component to render drag overlay based on drag source
 */

import Image from 'next/image';
import { PlayerWithValue } from '@/lib/api/players.api';
import { DraftRosterPlayer } from '@/lib/utils/fantasy-team-validation';
import { PlayerCard } from './PlayerCard';
import { formatPlayerName, getPositionCode } from '@/lib/utils/fantasy-utils';
import { getTeamJerseyPath } from '@/lib/utils/team-utils';
import positionStyles from './PitchFormation.module.scss';

interface DragOverlayContentProps {
  activePlayer: PlayerWithValue | null;
  activePositionPlayer: DraftRosterPlayer | null;
}

export function DragOverlayContent({
  activePlayer,
  activePositionPlayer,
}: DragOverlayContentProps) {
  if (!activePlayer) {
    return null;
  }

  if (activePositionPlayer) {
    // Dragging from position circle - show position circle
    return (
      <div
        className={positionStyles.position}
        style={{
          opacity: 0.95,
          transform: 'rotate(2deg) scale(1.05)',
          cursor: 'grabbing',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          border: '2px solid rgba(59, 130, 246, 1)',
        }}
      >
        <div className={positionStyles.positionIndicator}>
          {getPositionCode(activePositionPlayer.position)}
        </div>
        {(() => {
          const jerseyPath = getTeamJerseyPath(activePlayer.teamSlug || activePlayer.teamName);
          return jerseyPath ? (
            <div className={positionStyles.jerseyContainer}>
              <Image
                src={jerseyPath}
                alt={activePlayer.teamSlug || activePlayer.teamName || 'Team jersey'}
                className={positionStyles.jerseyImage}
                width={48}
                height={48}
              />
            </div>
          ) : (
            <div className={positionStyles.jerseyPlaceholder} />
          );
        })()}
        <div className={positionStyles.playerName}>
          {formatPlayerName(activePlayer.first_name, activePlayer.last_name)}
        </div>
      </div>
    );
  }

  // Dragging from player list - show player card
  return (
    <div
      style={{
        opacity: 0.95,
        transform: 'rotate(2deg) scale(1.02)',
        cursor: 'grabbing',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      }}
    >
      <PlayerCard player={activePlayer} isOnTeam={false} />
    </div>
  );
}

