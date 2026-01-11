import Image from 'next/image';
import { TeamIcon } from './TeamIcon';

export type TeamName = 'titans' | 'riptide' | 'flyers' | 'force';

const teamLogos: Record<TeamName, { small: string; large: string }> = {
  force: {
    small: '/images/teams/force-small.svg',
    large: '/images/teams/force.svg',
  },
  flyers: {
    small: '/images/teams/flyers-small.svg',
    large: '/images/teams/flyers.svg',
  },
  riptide: {
    small: '/images/teams/riptide-small.svg',
    large: '/images/teams/riptide.svg',
  },
  titans: {
    small: '/images/teams/titans-small.svg',
    large: '/images/teams/titans.svg',
  },
};

const validTeams: TeamName[] = ['titans', 'riptide', 'flyers', 'force'];

export function isValidTeamName(name: string): name is TeamName {
  return validTeams.includes(name.toLowerCase() as TeamName);
}

export function toTeamName(name: string): TeamName | null {
  const slug = name.toLowerCase();
  return isValidTeamName(slug) ? slug as TeamName : null;
}

interface TeamProps {
  team: TeamName;
  size?: 'small' | 'large';
  color?: string;
}

export function Team({ team, size = 'large', color }: TeamProps) {
  const logos = teamLogos[team];
  
  if (!logos) {
    return null;
  }

  const dimension = size === 'small' ? 20 : 40;
  
  // When color is provided, use TeamIcon component that inlines SVG for currentColor support
  if (color) {
    return (
      <TeamIcon
        src={logos[size]}
        alt={team}
        width={dimension}
        height={dimension}
        color={color}
      />
    );
  }
  
  // Otherwise use Next.js Image for optimization
  return (
    <Image 
      src={logos[size]} 
      alt={team} 
      width={dimension} 
      height={dimension} 
    />
  );
}
