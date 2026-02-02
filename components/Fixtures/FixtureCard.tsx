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

  // Determine if game is completed with scores
  const hasScores = fixture.is_completed && 
    fixture.home_score !== undefined && 
    fixture.away_score !== undefined;
  
  // Determine winner for styling
  const homeWon = hasScores && fixture.home_score! > fixture.away_score!;
  const awayWon = hasScores && fixture.away_score! > fixture.home_score!;
  const isTie = hasScores && fixture.home_score === fixture.away_score;

  return (
    <Link 
    href={`/fixtures/game/${fixture.id}`} 
    className={styles.detailsLink}
    scroll={false}
  >
    <Card className={styles.FixtureCard}>
      <div className={`${styles.teamContainer} ${homeWon ? styles.winner : ''} ${awayWon ? styles.loser : ''}`}>
        {homeTeamSlug && (
          <div className={styles.teamIcon} style={{ color: fixture.home_team.color || 'currentColor' }}>
            <Team team={homeTeamSlug} size="large" color={fixture.home_team.color} />
          </div>
        )}
        <span className={styles.teamNameFull}>{fixture.home_team.name}</span>
        <span className={styles.teamNameShort}>{homeTeamShortName}</span>
      </div>

      {/* Details - Score or Time */}
      <div className={styles.detailsContainer}>
        {hasScores ? (
          <div className={`${styles.score} ${isTie ? styles.tie : ''}`}>
            <span className={homeWon ? styles.winningScore : ''}>{fixture.home_score}</span>
            <span className={styles.scoreDivider}>-</span>
            <span className={awayWon ? styles.winningScore : ''}>{fixture.away_score}</span>
          </div>
        ) : (
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
        )}
      </div>  

      {/* Away Team */}
      <div className={`${styles.teamContainerAway} ${awayWon ? styles.winner : ''} ${homeWon ? styles.loser : ''}`}>
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
