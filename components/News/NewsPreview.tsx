import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/lib/news/article-service';
import styles from './NewsPreview.module.scss';

interface NewsPreviewProps {
  article: Article;
}

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

export function NewsPreview({ article }: NewsPreviewProps) {
  const relativeTime = article.publishedAt ? formatRelativeTime(article.publishedAt) : '';

  return (
    <Link href={`/news/${article.slug}`} className={styles.newsPreview}>
      <div className={styles.imageContainer}>
        {article.headerImage ? (
          <Image
            src={article.headerImage}
            alt={article.title}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 300px"
          />
        ) : (
          <div className={styles.placeholder} />
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{article.title}</h3>
        {relativeTime && <p className={styles.time}>{relativeTime}</p>}
      </div>
    </Link>
  );
}



