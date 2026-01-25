import { getFixtures } from '@/lib/api';
import { getLatestPlaylistVideo } from '@/lib/api/youtube.api';
import { getAllArticles } from '@/lib/news/article-service';
import { GameWithTeams } from '@/lib/domain/repositories/games.repository';
import { FixtureCard } from '@/components/Fixtures/FixtureCard';
import { TeamStandings } from '@/components/Standings/TeamStandings';
import { NewsPreview } from '@/components/News/NewsPreview';
import styles from './page.module.scss';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

export default async function Home() {
  const [fixtures, articles, latestVideo] = await Promise.all([
    getFixtures(),
    getAllArticles(),
    getLatestPlaylistVideo(),
  ]);

  // Filter to published articles and get latest 2
  const publishedArticles = articles
    .filter((article) => article.publishedAt)
    .slice(0, 2);

  // Get upcoming fixtures (not completed, sorted by scheduled_time)
  const now = new Date();
  const upcomingFixtures = fixtures
    .filter((fixture) => {
      if (fixture.is_completed) return false;
      if (!fixture.scheduled_time) return true;
      return new Date(fixture.scheduled_time) > now;
    })
    .sort((a, b) => {
      if (!a.scheduled_time && !b.scheduled_time) return 0;
      if (!a.scheduled_time) return 1;
      if (!b.scheduled_time) return -1;
      return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
    })
    .slice(0, 2); // Get first 2 upcoming

  // Get most recent completed game for featured section
  const completedGames = fixtures
    .filter((fixture) => fixture.is_completed && fixture.scheduled_time)
    .sort((a, b) => {
      if (!a.scheduled_time || !b.scheduled_time) return 0;
      return new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime();
    });

  const featuredGame = completedGames[0] || upcomingFixtures[0];
  const featuredGameTime = featuredGame?.scheduled_time
    ? formatRelativeTime(featuredGame.scheduled_time)
    : null;

  // YouTube video URL - fetches latest video from playlist, falls back to hardcoded
  const youtubeUrl = latestVideo?.embedUrl ?? 'https://www.youtube.com/embed/JTEO-0ka2Uo';

  return (
    <main className={styles.container}>
      <div className={styles.main}>
        {/* Featured Section */}
        <section className={styles.featured}>
          <div className={styles.videoContainer}>
            <iframe
              src={youtubeUrl}
              title={latestVideo?.title ?? 'Adelaide Super League Game'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.video}
            />
          </div>
          {featuredGame && (
            <div className={styles.featuredInfo}>
              <h2 className={styles.featuredTitle}>
                Featured match
              </h2>
              {featuredGameTime && (
                <p className={styles.featuredTime}>
                  Streamed live on Ulti.tv
                </p>
              )}
              {/* <span className={styles.liveBadge}>• Live on Ulti.tv</span> */}
            </div>
          )}
        </section>

        {/* Up Next Section */}
        <section className={styles.upNext}>
          <h2 className={styles.sectionTitle}>Up next</h2>
          <div className={styles.fixturesList}>
            {upcomingFixtures.length > 0 ? (
              upcomingFixtures.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))
            ) : (
              <p className={styles.empty}>No upcoming fixtures scheduled.</p>
            )}
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Team Standings */}
        <section className={styles.sidebarSection}>
          <h2 className={styles.sidebarTitle}>Ladder</h2>
          <TeamStandings />
        </section>

        {/* Latest News */}
        <section className={styles.sidebarSection}>
          <h2 className={styles.sidebarTitle}>Latest</h2>
          <div className={styles.newsList}>
            {publishedArticles.length > 0 ? (
              publishedArticles.map((article) => (
                <NewsPreview key={article.slug} article={article} />
              ))
            ) : (
              <p className={styles.empty}>No articles yet.</p>
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}
