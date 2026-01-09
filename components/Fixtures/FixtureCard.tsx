import Link from 'next/link';
import { Card } from '@/components/Card';
import { Team, TeamName } from '@/components/Team';
import { GameWithTeams } from '@/lib/domain/repositories/games.repository';

interface FixtureCardProps {
  fixture: GameWithTeams;
}

export function FixtureCard({ fixture }: FixtureCardProps) {
  const homeTeamSlug = fixture.home_team.slug as TeamName | undefined;
  const awayTeamSlug = fixture.away_team.slug as TeamName | undefined;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {homeTeamSlug && <Team team={homeTeamSlug} />}
            <span className="font-semibold">{fixture.home_team.name}</span>
          </div>
          <div className="text-gray-500">vs</div>
          <div className="flex items-center gap-2">
            {awayTeamSlug && <Team team={awayTeamSlug} />}
            <span className="font-semibold">{fixture.away_team.name}</span>
          </div>
        </div>
        <div className="text-sm text-gray-600">
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
      <div className="mt-2 text-sm flex items-center gap-4">
        <Link 
          href={`/fixtures/game/${fixture.id}`} 
          className="text-blue-600 hover:underline"
          scroll={false}
        >
          See details
        </Link>
        {fixture.broadcast_link && (
          <a 
            href={fixture.broadcast_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Watch broadcast
          </a>
        )}
      </div>
    </Card>
  );
}
