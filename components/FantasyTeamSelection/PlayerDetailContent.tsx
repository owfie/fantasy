'use client';

import { Player } from '@/lib/domain/types';
import { formatCurrency, formatPlayerName } from '@/lib/utils/fantasy-utils';
import { getTeamEmoji } from '@/lib/utils/team-emojis';
import { getTeamShortName } from '@/lib/utils/team-utils';

interface PlayerDetailContentProps {
  player: Player;
}

export function PlayerDetailContent({ player }: PlayerDetailContentProps) {
  const fullName = `${player.first_name} ${player.last_name}`;
  const teamShortName = getTeamShortName('', ''); // Will need team data
  const emoji = getTeamEmoji('');

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{fullName}</h1>
      {/* Player details content - similar to drawer but as a page */}
    </div>
  );
}

