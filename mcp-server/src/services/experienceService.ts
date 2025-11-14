import { SupabaseClient } from '../lib/supabase';
import { ExperienceRecordWithKeywords, ExperienceRecordForUpdate, ExperienceKeywordRecord } from '../types/supabase';

export interface ExperienceRecord {
  id: string;
  user_id: string | null;
  title: string;
  problem_description: string;
  root_cause: string | null;
  solution: string;
  context: string | null;
  status: string;
  query_count: number;
  relevance_score: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  keywords?: string[];
}

export interface QueryOptions {
  keywords?: string[];
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'query_count' | 'created_at';
}

export class ExperienceService {
  constructor(private supabase: SupabaseClient) {}

  async queryExperiences(options: QueryOptions): Promise<ExperienceRecord[]> {
    const {
      keywords = [],
      limit = 10,
      offset = 0,
      sort = 'relevance'
    } = options;

    console.log('Building Supabase query with options:', {
      keywords,
      limit,
      offset,
      sort
    });

    // If keywords are provided, first get the experience_ids that match
    let experienceIds: string[] | undefined;
    if (keywords.length > 0) {
      // Normalize keywords (lowercase and trim) to match how they're stored
      const normalizedKeywords = keywords.map(k => k.toLowerCase().trim());
      
      // Query experience_keywords to find matching experience_ids
      const { data: keywordMatches, error: keywordError } = await this.supabase
        .from('experience_keywords')
        .select('experience_id')
        .in('keyword', normalizedKeywords);

      if (keywordError) {
        console.error('Error querying keywords:', keywordError);
        throw new Error(`Failed to query keywords: ${keywordError.message}`);
      }

      // Extract unique experience_ids
      if (keywordMatches && keywordMatches.length > 0) {
        experienceIds = [...new Set(keywordMatches.map((k: any) => k.experience_id))];
        console.log(`Found ${experienceIds.length} experiences matching keywords:`, normalizedKeywords);
      } else {
        // No matches found, return empty result
        console.log('No experiences found matching keywords:', normalizedKeywords);
        return [];
      }
    }

    let query = this.supabase
      .from('experience_records')
      .select(`
        *,
        experience_keywords:experience_keywords(keyword)
      `)
      .eq('status', 'published');

    // Apply keyword filtering if provided
    if (experienceIds && experienceIds.length > 0) {
      query = query.in('id', experienceIds);
    } else if (keywords.length > 0) {
      // If keywords were provided but no matches found, return empty
      return [];
    }

    // Apply range after filtering
    query = query.range(offset, offset + limit - 1);

    // Apply sorting
    switch (sort) {
      case 'query_count':
        query = query.order('query_count', { ascending: false });
        break;
      case 'created_at':
        query = query.order('created_at', { ascending: false });
        break;
      case 'relevance':
      default:
        query = query.order('relevance_score', { ascending: false });
        break;
    }

    console.log('Executing Supabase query...');
    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to query experiences: ${error.message}`);
    }
    console.log('Query completed successfully');

    // Transform the data to include keywords as an array
    return (data as any[]).map(record => ({
      ...record,
      keywords: record.experience_keywords?.map((k: any) => k.keyword) || []
    }));
  }

  async updateQueryCount(experienceIds: string[]): Promise<void> {
    if (experienceIds.length === 0) return;

    // 简单的计数更新，避免复杂的rpc调用
    const { data: experiences, error: fetchError } = await this.supabase
      .from('experience_records')
      .select('id, query_count')
      .in('id', experienceIds);

    if (fetchError || !experiences) {
      console.error('Failed to fetch experiences for query count update:', fetchError?.message);
      return;
    }

    for (const exp of experiences) {
      const { error } = await (this.supabase
        .from('experience_records') as any)
        .update({
          query_count: (exp as any).query_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', (exp as any).id);

      if (error) {
        console.error(`Failed to update query count for experience ${(exp as any).id}:`, error.message);
      }
    }
  }

  async createExperience(experience: Omit<ExperienceRecord, 'id' | 'created_at' | 'updated_at' | 'query_count' | 'relevance_score' | 'status' | 'deleted_at'>, keywords: string[]): Promise<string> {
    const { data: experienceData, error: experienceError } = await this.supabase
      .from('experience_records')
      .insert({
        ...experience as any,
        status: 'published',
        query_count: 0,
        relevance_score: 0.0,
        deleted_at: null
      })
      .select('id')
      .single();

    if (experienceError) {
      throw new Error(`Failed to create experience: ${experienceError.message}`);
    }

    // Insert keywords
    if (keywords.length > 0) {
      const keywordRecords = keywords.map(keyword => ({
        experience_id: (experienceData as any).id,
        keyword: keyword.toLowerCase().trim()
      }));

      const { error: keywordError } = await (this.supabase
        .from('experience_keywords') as any)
        .insert(keywordRecords);

      if (keywordError) {
        console.error('Failed to insert keywords:', keywordError.message);
        // Continue even if keyword insertion fails
      }
    }

    return (experienceData as any).id;
  }
}