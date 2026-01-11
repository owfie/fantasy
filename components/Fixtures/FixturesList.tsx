import { getFixtures } from '@/lib/api';
import { GameWithTeams } from '@/lib/domain/repositories/games.repository';
import { FixtureCard } from './FixtureCard';
import { formatInACST } from '@/lib/utils/date-utils';
import styles from './FixturesList.module.scss';

export async function FixturesList() {
  const fixtures = await getFixtures();

  if (!fixtures || fixtures.length === 0) {
    return <p>No fixtures found.</p>;
  }

  // Group fixtures by date
  const fixturesByDate = fixtures.reduce((acc, fixture) => {
    if (!fixture.scheduled_time) {
      const noDateKey = 'TBD';
      if (!acc[noDateKey]) {
        acc[noDateKey] = [];
      }
      acc[noDateKey].push(fixture);
      return acc;
    }

    const dateKey = formatInACST(fixture.scheduled_time, { 
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
    const dateA = fixturesByDate[a][0]?.scheduled_time;
    const dateB = fixturesByDate[b][0]?.scheduled_time;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  return (
    <>
      {sortedDates.map(dateKey => (
        <div key={dateKey} className={styles.group}>
          <>{dateKey}</>
          <div className={styles.deck}>
            {fixturesByDate[dateKey].map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
