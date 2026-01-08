import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { Article, InsertArticle, UpdateArticle } from '../types';

export class ArticlesRepository extends BaseRepository<Article, InsertArticle, UpdateArticle> {
  constructor(client: SupabaseClient) {
    super(client, 'articles');
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find article by slug: ${error.message}`);
    }

    return data as Article;
  }

  async findPublished(): Promise<Article[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find published articles: ${error.message}`);
    }

    return (data || []) as Article[];
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('author_id', authorId)
      .order('published_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find articles by author: ${error.message}`);
    }

    return (data || []) as Article[];
  }

  async findByTag(tagId: string): Promise<Article[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        article_tag_assignments!inner(tag_id)
      `)
      .eq('article_tag_assignments.tag_id', tagId)
      .order('published_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find articles by tag: ${error.message}`);
    }

    return (data || []) as Article[];
  }

  async getArticleTags(articleId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('article_tag_assignments')
      .select('tag_id')
      .eq('article_id', articleId);

    if (error) {
      throw new Error(`Failed to get article tags: ${error.message}`);
    }

    return (data || []).map((item) => item.tag_id);
  }

  async assignTag(articleId: string, tagId: string): Promise<void> {
    const { error } = await this.client
      .from('article_tag_assignments')
      .insert({ article_id: articleId, tag_id: tagId });

    if (error) {
      throw new Error(`Failed to assign tag to article: ${error.message}`);
    }
  }

  async removeTag(articleId: string, tagId: string): Promise<void> {
    const { error } = await this.client
      .from('article_tag_assignments')
      .delete()
      .eq('article_id', articleId)
      .eq('tag_id', tagId);

    if (error) {
      throw new Error(`Failed to remove tag from article: ${error.message}`);
    }
  }
}

