import type { Metadata } from 'next';
import { getAllArticles } from '@/lib/news/article-service';
import { NewsPageClient } from '@/components/News/NewsPageClient';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'News | Adelaide Super League',
  description: 'Latest news and updates from Adelaide Super League',
};

export default async function NewsPage() {
  const articles = await getAllArticles();
  
  // Filter to only published articles
  const publishedArticles = articles.filter((article) => article.publishedAt);

  return (
    <main className={styles.container}>
      <NewsPageClient articles={publishedArticles} />
    </main>
  );
}
