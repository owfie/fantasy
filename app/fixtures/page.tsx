import { getFixtures } from '@/lib/api';
import { GameWithTeams } from '@/lib/domain/repositories/games.repository';
import Link from 'next/link';
import { Card } from '@/components/Card';
import styles from './page.module.scss';

export default async function FixturesPage() {
  const fixtures = await getFixtures();

  if (!fixtures || fixtures.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Fixtures</h1>
        <p>No fixtures found.</p>
      </main>
    );
  }

  // Group fixtures by date
  const fixturesByDate = fixtures.reduce((acc, fixture) => {
    if (!fixture.scheduled_time) {
      // Handle fixtures without scheduled time
      const noDateKey = 'TBD';
      if (!acc[noDateKey]) {
        acc[noDateKey] = [];
      }
      acc[noDateKey].push(fixture);
      return acc;
    }

    const date = new Date(fixture.scheduled_time);
    const dateKey = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(fixture);
    return acc;
  }, {} as Record<string, GameWithTeams[]>);

  // Sort fixtures within each date by time
  Object.keys(fixturesByDate).forEach(dateKey => {
    fixturesByDate[dateKey].sort((a, b) => {
      if (!a.scheduled_time && !b.scheduled_time) return 0;
      if (!a.scheduled_time) return 1;
      if (!b.scheduled_time) return -1;
      return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
    });
  });

  // Sort dates chronologically
  const sortedDates = Object.keys(fixturesByDate).sort((a, b) => {
    if (a === 'TBD') return 1;
    if (b === 'TBD') return -1;
    // Extract date from string for comparison
    const dateA = fixturesByDate[a][0]?.scheduled_time;
    const dateB = fixturesByDate[b][0]?.scheduled_time;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  return (
    <div className={styles.container}>
      <h1>Fixtures</h1>
      
      {sortedDates.map(dateKey => (
        <div key={dateKey} className={styles.group}>
          <>{dateKey}</>
          <div className={styles.deck}>
            {fixturesByDate[dateKey].map(fixture => (
              <Card key={fixture.id}>
                <Link href={`/fixtures/game/${fixture.id}`} className="block" scroll={false}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="font-semibold">{fixture.home_team.name}</div>
                      <div className="text-gray-500">vs</div>
                      <div className="font-semibold">{fixture.away_team.name}</div>
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
                </Link>
                <div className="mt-2 text-sm">
                  {fixture.broadcast_link ? (
                    <a 
                      href={fixture.broadcast_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Watch Broadcast
                    </a>
                  ) : (
                    <span className="text-gray-500">No broadcast link</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
