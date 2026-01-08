/**
 * Article Service
 * Handles reading articles from markdown files (no database needed)
 */

import { generateSlug } from '@/lib/utils/slug';
import { parseAllArticles } from './article-parser';
import type { ParsedArticle } from './types';
import { join } from 'path';

const CONTENT_DIR = join(process.cwd(), 'content', 'articles');

export interface Article {
  slug: string;
  title: string;
  description?: string;
  author: string;
  tags: string[];
  headerImage?: string;
  publishedAt?: string;
  content: string;
  filename: string;
}

/**
 * Generate a unique slug by checking against existing articles
 */
function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

/**
 * Convert parsed article to Article format
 */
function parsedToArticle(parsed: ParsedArticle, existingSlugs: string[]): Article {
  const baseSlug = generateSlug(parsed.frontmatter.title);
  const slug = generateUniqueSlug(baseSlug, existingSlugs);

  return {
    slug,
    title: parsed.frontmatter.title,
    description: parsed.frontmatter.description,
    author: parsed.frontmatter.author,
    tags: parsed.frontmatter.tags || [],
    headerImage: parsed.frontmatter.headerImage,
    publishedAt: parsed.frontmatter.publishedAt,
    content: parsed.content,
    filename: parsed.filename,
  };
}

/**
 * Get all articles with content
 */
export async function getAllArticles(): Promise<Article[]> {
  const parsedArticles = parseAllArticles(CONTENT_DIR);
  const articles: Article[] = [];
  const existingSlugs: string[] = [];

  for (const parsed of parsedArticles) {
    const article = parsedToArticle(parsed, existingSlugs);
    existingSlugs.push(article.slug);
    articles.push(article);
  }

  // Sort by published_at descending
  return articles.sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Get article by slug with content
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getAllArticles();
  return articles.find((article) => article.slug === slug) || null;
}

/**
 * Get articles by tag
 */
export async function getArticlesByTag(tagName: string): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles.filter((article) => article.tags.includes(tagName));
}

/**
 * Get articles by author
 */
export async function getArticlesByAuthor(authorName: string): Promise<Article[]> {
  const articles = await getAllArticles();
  return articles.filter((article) => article.author === authorName);
}
