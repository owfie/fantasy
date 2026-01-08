import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { ArticleTag, InsertArticleTag, UpdateArticleTag } from '../types';

export class ArticleTagsRepository extends BaseRepository<ArticleTag, InsertArticleTag, UpdateArticleTag> {
  constructor(client: SupabaseClient) {
    super(client, 'article_tags');
  }

  async findBySlug(slug: string): Promise<ArticleTag | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find article tag by slug: ${error.message}`);
    }

    return data as ArticleTag;
  }

  async findByName(name: string): Promise<ArticleTag | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find article tag by name: ${error.message}`);
    }

    return data as ArticleTag;
  }
}

