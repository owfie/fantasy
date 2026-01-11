import Link from 'next/link';
import { Card } from '@/components/Card';
import { Team, TeamName } from '@/components/Team';
import { GameWithTeams } from '@/lib/domain/repositories/games.repository';
import { getTeamShortName } from '@/lib/utils/team-utils';
import { formatInACST } from '@/lib/utils/date-utils';
import styles from './FixtureCard.module.scss';

interface FixtureCardProps {
  fixture: GameWithTeams;
}

export function FixtureCard({ fixture }: FixtureCardProps) {
  const homeTeamSlug = fixture.home_team.slug as TeamName | undefined;
  const awayTeamSlug = fixture.away_team.slug as TeamName | undefined;
  const homeTeamShortName = getTeamShortName(fixture.home_team.name, fixture.home_team.slug);
  const awayTeamShortName = getTeamShortName(fixture.away_team.name, fixture.away_team.slug);

  return (
    <Link 
    href={`/fixtures/game/${fixture.id}`} 
    className={styles.detailsLink}
    scroll={false}
  >
    <Card className={styles.FixtureCard}>
      <div className={styles.teamContainer}>
        {homeTeamSlug && (
          <div className={styles.teamIcon} style={{ color: fixture.home_team.color || 'currentColor' }}>
            <Team team={homeTeamSlug} size="large" color={fixture.home_team.color} />
          </div>
        )}
        <span className={styles.teamNameFull}>{fixture.home_team.name}</span>
        <span className={styles.teamNameShort}>{homeTeamShortName}</span>
      </div>

      {/* Details */}
      <div className={styles.detailsContainer}>
        <div className={styles.time}>
          {fixture.scheduled_time 
            ? formatInACST(fixture.scheduled_time, { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
            : 'TBD'
          }
        </div>
      </div>  

      {/* Away Team */}
      <div className={styles.teamContainerAway}>
        <span className={styles.teamNameFull}>{fixture.away_team.name}</span>
        <span className={styles.teamNameShort}>{awayTeamShortName}</span>
        {awayTeamSlug && (
          <div className={styles.teamIcon} style={{ color: fixture.away_team.color || 'currentColor' }}>
            <Team team={awayTeamSlug} size="large" color={fixture.away_team.color} />
          </div>
        )}
      </div>
       
  
    </Card>
    </Link>
  );
}
