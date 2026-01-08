/**
 * Article Parser
 * Parses markdown files with frontmatter
 */

import matter from 'gray-matter';
import { ArticleFrontmatter, ParsedArticle } from './types';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Parse a single markdown file with frontmatter
 */
export function parseArticleFile(filePath: string): ParsedArticle {
  const fileContent = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  // Validate required fields
  if (!data.title) {
    throw new Error(`Article missing required field 'title': ${filePath}`);
  }
  if (!data.author) {
    throw new Error(`Article missing required field 'author': ${filePath}`);
  }

  const frontmatter: ArticleFrontmatter = {
    title: data.title,
    description: data.description,
    author: data.author,
    tags: data.tags || [],
    headerImage: data.headerImage || data.header_image,
    publishedAt: data.publishedAt || data.published_at,
  };

  return {
    frontmatter,
    content: content.trim(),
    filename: filePath.split('/').pop() || '',
  };
}

/**
 * Get all article files from the content directory
 */
export function getArticleFiles(contentDir: string): string[] {
  try {
    const files = readdirSync(contentDir, { withFileTypes: true });
    return files
      .filter((file) => file.isFile() && file.name.endsWith('.md'))
      .map((file) => join(contentDir, file.name));
  } catch (error) {
    // Directory doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Parse all article files from the content directory
 */
export function parseAllArticles(contentDir: string): ParsedArticle[] {
  const files = getArticleFiles(contentDir);
  return files.map((file) => parseArticleFile(file));
}

