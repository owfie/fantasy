import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllArticles } from '@/lib/news/article-service';

export const metadata: Metadata = {
  title: 'News | Adelaide Super League',
  description: 'Latest news and updates from Adelaide Super League',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function NewsPage() {
  const articles = await getAllArticles();
  
  // Filter to only published articles
  const publishedArticles = articles.filter((article) => article.publishedAt);



  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-8">News</h1>
      
      {publishedArticles.length === 0 ? (
        <p>No articles yet. Check back soon!</p>
      ) : (
        <div className="space-y-8">
          {publishedArticles.map((article) => (
            <article key={article.slug} className="border-b pb-8 last:border-b-0">
              <Link href={`/news/${article.slug}`}>
                <h2 className="text-2xl font-semibold mb-2 hover:underline">
                  {article.title}
                </h2>
              </Link>
              
              {article.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {article.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                {article.author && (
                  <span>By {article.author}</span>
                )}
                {article.publishedAt && (
                  <span>{formatDate(article.publishedAt)}</span>
                )}
                {article.tags.length > 0 && (
                  <div className="flex gap-2">
                    {article.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

