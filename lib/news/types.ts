/**
 * Types for the news/article system
 */

export interface ArticleFrontmatter {
  title: string;
  description?: string;
  author: string; // Author name (will be resolved to author_id)
  tags?: string[]; // Tag names (will be resolved to tag_ids)
  headerImage?: string; // Path to header image
  publishedAt?: string; // ISO date string
}

export interface ParsedArticle {
  frontmatter: ArticleFrontmatter;
  content: string; // Markdown content
  filename: string; // Original filename
}

