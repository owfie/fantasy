import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { ArticleAuthor, InsertArticleAuthor, UpdateArticleAuthor } from '../types';

export class ArticleAuthorsRepository extends BaseRepository<ArticleAuthor, InsertArticleAuthor, UpdateArticleAuthor> {
  constructor(client: SupabaseClient) {
    super(client, 'article_authors');
  }

  async findByName(name: string): Promise<ArticleAuthor | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find article author by name: ${error.message}`);
    }

    return data as ArticleAuthor;
  }
}

