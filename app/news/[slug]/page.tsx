import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllArticles } from '@/lib/news/article-service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.scss';
import './markdown.css';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles
    .filter((article) => article.publishedAt)
    .map((article) => ({
      slug: article.slug,
    }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article Not Found | Adelaide Super League',
    };
  }

  const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const imageUrl = article.headerImage
    ? `${defaultUrl}${article.headerImage}`
    : undefined;

  return {
    title: `${article.title} | Adelaide Super League`,
    description: article.description || article.title,
    openGraph: {
      title: article.title,
      description: article.description || article.title,
      images: imageUrl ? [{ url: imageUrl }] : [],
      type: 'article',
      publishedTime: article.publishedAt || undefined,
      authors: article.author ? [article.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description || article.title,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className={styles.container}>
      <Link href="/news" className={styles.backButton}>
        Back to Articles
      </Link>
      
      <article>
        <header className={styles.articleHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{article.title}</h1>
            {article.author && (
              <p className={styles.author}>{article.author}</p>
            )}
            <div className={styles.metaInfo}>
              {article.publishedAt && (
                <span className={styles.date}>{formatDate(article.publishedAt)}</span>
              )}
              {article.tags.length > 0 && (
                <div className={styles.tags}>
                  {article.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {article.description && (
              <p className={styles.description}>
                {article.description}
              </p>
            )}
          </div>
          
          {article.headerImage && (
            <div className={styles.headerImageWrapper}>
              <Image
                src={article.headerImage}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
        </header>
        
        <div className={`${styles.content} markdownContent`}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={{
              br: () => <br />,
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}

