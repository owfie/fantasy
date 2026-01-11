'use client';

import { useState, useMemo } from 'react';
import { Article } from '@/lib/news/article-service';
import { NewsPreview } from './NewsPreview';
import { NewsFilters } from './NewsFilters';
import styles from './NewsPageClient.module.scss';

interface NewsPageClientProps {
  articles: Article[];
}

type FilterType = 'all' | 'opinion' | 'official';

export function NewsPageClient({ articles }: NewsPageClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredArticles = useMemo(() => {
    if (activeFilter === 'all') {
      return articles;
    }

    const filterTag = activeFilter === 'opinion' ? 'Opinion' : 'Official';
    return articles.filter((article) => 
      article.tags.some((tag) => tag.toLowerCase() === filterTag.toLowerCase())
    );
  }, [articles, activeFilter]);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Latest</h1>
        <NewsFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>
      
      {filteredArticles.length === 0 ? (
        <p className={styles.empty}>No articles yet. Check back soon!</p>
      ) : (
        <div className={styles.grid}>
          {filteredArticles.map((article) => (
            <NewsPreview key={article.slug} article={article} />
          ))}
        </div>
      )}
    </>
  );
}


