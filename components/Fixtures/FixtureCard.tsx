import Link from 'next/link';
import { Card } from '@/components/Card';
import { Team, TeamName } from '@/components/Team';
import { GameWithTeams } from '@/lib/domain/repositories/games.repository';
import styles from './FixtureCard.module.scss';

interface FixtureCardProps {
  fixture: GameWithTeams;
}

export function FixtureCard({ fixture }: FixtureCardProps) {
  const homeTeamSlug = fixture.home_team.slug as TeamName | undefined;
  const awayTeamSlug = fixture.away_team.slug as TeamName | undefined;

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
        <span className={styles.teamName}>{fixture.home_team.name}</span>
      </div>

      {/* Details */}
      <div className={styles.detailsContainer}>
        <div className={styles.time}>
          {fixture.scheduled_time 
            ? new Date(fixture.scheduled_time).toLocaleTimeString('en-US', { 
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
        <span className={styles.teamName}>{fixture.away_team.name}</span>
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
