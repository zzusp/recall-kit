import { supabase } from '../supabase/client';
import { Database } from '@/types/database';
import { EmbeddingService } from './embeddingService';
import { createClient } from '@supabase/supabase-js';

export type ExperienceRecord = Database['public']['Tables']['experience_records']['Row'] & {
  keywords?: string[];
  similarity?: number; // For vector search results
};

export interface QueryOptions {
  q?: string;
  keywords?: string[];
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'query_count' | 'created_at';
  useVectorSearch?: boolean; // Enable vector search if available
}

export class ExperienceService {
  private embeddingService: EmbeddingService;
  private supabaseClient: ReturnType<typeof createClient<Database>>;

  constructor(supabaseClient?: ReturnType<typeof createClient<Database>>) {
    this.supabaseClient = supabaseClient || supabase;
    this.embeddingService = new EmbeddingService(supabaseClient);
  }

  async queryExperiences(options: QueryOptions): Promise<{
    experiences: ExperienceRecord[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const {
      q = '',
      keywords = [],
      limit = 10,
      offset = 0,
      sort = 'relevance',
      useVectorSearch = true // Default to true, will fallback if not available
    } = options;

    // Try vector search first if query is provided and embedding service is available
    if (q.trim() && useVectorSearch) {
      const isAvailable = await this.embeddingService.isAvailable();
      console.log('[ExperienceService] Vector search check:', {
        query: q,
        useVectorSearch,
        isAvailable,
        willTryVectorSearch: isAvailable
      });
      
      if (isAvailable) {
        try {
          console.log('[ExperienceService] Attempting vector search...');
          const vectorResults = await this.queryByVector(q, limit, offset);
          console.log('[ExperienceService] Vector search results:', {
            resultCount: vectorResults?.length || 0,
            hasResults: !!(vectorResults && vectorResults.length > 0)
          });
          
          if (vectorResults && vectorResults.length > 0) {
            // Apply keyword filtering if provided
            let filteredResults = vectorResults;
            if (keywords.length > 0) {
              filteredResults = vectorResults.filter(exp => 
                exp.keywords && keywords.some(k => exp.keywords!.includes(k))
              );
            }

            console.log('[ExperienceService] Using vector search results:', filteredResults.length);
            return {
              experiences: filteredResults,
              totalCount: filteredResults.length,
              hasMore: false // Vector search doesn't support pagination easily
            };
          } else {
            console.log('[ExperienceService] Vector search returned no results, falling back to text search');
          }
        } catch (error) {
          console.warn('[ExperienceService] Vector search failed, falling back to text search:', error);
          // Fall through to text search
        }
      } else {
        console.log('[ExperienceService] Embedding service not available, using text search');
      }
    }

    // Fallback to traditional text search
    let query = this.supabaseClient
      .from('experience_records')
      .select(`
        *,
        experience_keywords:experience_keywords(keyword)
      `, { count: 'exact' })
      .eq('status', 'published')
      .range(offset, offset + limit - 1);

    // Apply text search if provided
    if (q.trim()) {
      // Normalize search query to lowercase for case-insensitive search
      const normalizedQuery = q.trim().toLowerCase();
      const searchPattern = `%${normalizedQuery}%`;
      
      // Use OR condition with ILIKE for fuzzy matching across multiple fields
      // ILIKE provides case-insensitive partial matching (fuzzy search)
      // This allows matching partial words and phrases in any position
      query = query.or(
        `title.ilike.${searchPattern},` +
        `problem_description.ilike.${searchPattern},` +
        `solution.ilike.${searchPattern},` +
        `root_cause.ilike.${searchPattern},` +
        `context.ilike.${searchPattern}`
      );
    }

    // Apply keyword filtering if provided
    if (keywords.length > 0) {
      const { data: keywordMatches } = await this.supabaseClient
        .from('experience_keywords')
        .select('experience_id')
        .in('keyword', keywords);

      if (keywordMatches && keywordMatches.length > 0) {
        const experienceIds = Array.from(new Set(keywordMatches.map((k: { experience_id: string }) => k.experience_id)));
        query = query.in('id', experienceIds);
      } else {
        // No matches found, return empty result
        return {
          experiences: [],
          totalCount: 0,
          hasMore: false
        };
      }
    }

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

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to query experiences: ${error.message}`);
    }

    // Transform the data to include keywords as an array
    const experiences = (data || []).map(record => {
      // Handle different possible data structures from Supabase
      let keywords: string[] = [];
      
      if ((record as any).experience_keywords) {
        if (Array.isArray((record as any).experience_keywords)) {
          // If it's an array, map to get keywords
          keywords = (record as any).experience_keywords
            .map((k: any) => {
              // Handle both { keyword: "value" } and direct string values
              return typeof k === 'string' ? k : (k?.keyword || k);
            })
            .filter((k: any) => k && typeof k === 'string');
        } else if (typeof (record as any).experience_keywords === 'object') {
          // If it's a single object, extract the keyword
          const keyword = (record as any).experience_keywords.keyword;
          if (keyword) keywords = [keyword];
        }
      }
      
      // Debug log to check data structure
      if (process.env.NODE_ENV === 'development') {
        console.log('Experience record:', {
          id: (record as any).id,
          title: (record as any).title,
          experience_keywords_raw: (record as any).experience_keywords,
          keywords_extracted: keywords
        });
      }
      
      return {
        ...record as ExperienceRecord,
        keywords
      };
    });

    return {
      experiences,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  }

  async getExperienceById(id: string): Promise<ExperienceRecord | null> {
    const { data, error } = await this.supabaseClient
      .from('experience_records')
      .select(`
        *,
        experience_keywords:experience_keywords(keyword)
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get experience: ${error.message}`);
    }

    return {
      ...data as ExperienceRecord,
      keywords: (data as any).experience_keywords?.map((k: any) => k.keyword) || []
    };
  }

  async incrementViewCount(experienceId: string): Promise<number> {
    try {
      // 使用原子更新操作，直接使用 SQL 的 view_count = view_count + 1
      // 这样可以避免竞态条件，并且更高效
      const { data, error } = await this.supabaseClient.rpc('increment_view_count', {
        experience_id: experienceId
      });

      if (error) {
        // 如果 RPC 函数不存在，回退到手动更新方式
        console.warn('RPC function not available, using manual update:', error.message);
        
        // 检查 view_count 列是否存在，如果不存在则跳过更新
        // 获取当前的 view_count
        const { data: experience, error: fetchError } = await this.supabaseClient
          .from('experience_records')
          .select('view_count')
          .eq('id', experienceId)
          .single();

        if (fetchError) {
          // 如果错误是因为列不存在，静默处理（迁移可能还未应用）
          if (fetchError.message?.includes('does not exist') || fetchError.message?.includes('view_count')) {
            console.warn('view_count column does not exist, skipping update. Please run migration 005_add_view_count.sql');
            return 0;
          }
          console.error('Failed to fetch experience for view count update:', fetchError?.message);
          return 0;
        }

        if (!experience) {
          console.error('Experience not found for view count update');
          return 0;
        }

        const newCount = (experience.view_count || 0) + 1;

        // 增加 view_count
        const { error: updateError } = await this.supabaseClient
          .from('experience_records')
          .update({
            view_count: newCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', experienceId);

        if (updateError) {
          // 如果错误是因为列不存在，静默处理
          if (updateError.message?.includes('does not exist') || updateError.message?.includes('view_count')) {
            console.warn('view_count column does not exist, skipping update. Please run migration 005_add_view_count.sql');
            return 0;
          }
          console.error(`Failed to update view count for experience ${experienceId}:`, updateError.message);
          return 0;
        }

        return newCount;
      }

      return data || 0;
    } catch (error) {
      // 捕获所有错误，包括列不存在的错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('does not exist') || errorMessage.includes('view_count')) {
        console.warn('view_count column does not exist, skipping update. Please run migration 005_add_view_count.sql');
        return 0;
      }
      console.error('Error in incrementViewCount:', error);
      return 0;
    }
  }

  /**
   * Query experiences using vector similarity search
   */
  private async queryByVector(
    queryText: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<ExperienceRecord[]> {
    try {
      console.log('[ExperienceService] queryByVector called:', { queryText, limit, offset });
      
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(queryText);
      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('[ExperienceService] Failed to generate query embedding');
        return [];
      }

      console.log('[ExperienceService] Generated query embedding:', {
        dimensions: queryEmbedding.length,
        firstFew: queryEmbedding.slice(0, 5)
      });

      // First, check how many experiences have embeddings
      const { count: embeddingCount, error: countError } = await this.supabaseClient
        .from('experience_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .not('embedding', 'is', null);
      
      console.log('[ExperienceService] Experiences with embeddings:', {
        count: embeddingCount,
        hasError: !!countError,
        error: countError
      });

      // Call the RPC function for vector search
      // Lower threshold for bge-m3 model (0.3 instead of 0.5 to get more results)
      // bge-m3 typically has lower similarity scores, so we need a lower threshold
      const matchThreshold = 0.3;
      console.log('[ExperienceService] Calling match_experiences_by_embedding RPC:', {
        match_threshold: matchThreshold,
        match_count: limit + offset,
        queryEmbeddingDimensions: queryEmbedding.length
      });
      
      const { data, error } = await this.supabaseClient.rpc('match_experiences_by_embedding', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: limit + offset
      });

      if (error) {
        console.error('[ExperienceService] Vector search RPC error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return [];
      }

      console.log('[ExperienceService] Vector search RPC response:', {
        dataLength: data?.length || 0,
        hasData: !!(data && data.length > 0),
        firstResult: data?.[0] ? {
          id: data[0].id,
          title: data[0].title,
          similarity: data[0].similarity
        } : null,
        allSimilarities: data?.map((r: any) => r.similarity) || []
      });

      let finalData = data;
      
      if (!data || data.length === 0) {
        console.log('[ExperienceService] No results from vector search. Trying with lower threshold (0.1)...');
        // Try with even lower threshold
        const { data: lowThresholdData, error: lowThresholdError } = await this.supabaseClient.rpc('match_experiences_by_embedding', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: limit + offset
        });
        
        if (!lowThresholdError && lowThresholdData && lowThresholdData.length > 0) {
          console.log('[ExperienceService] Found results with lower threshold (0.1):', {
            count: lowThresholdData.length,
            similarities: lowThresholdData.map((r: any) => r.similarity)
          });
          // Use the lower threshold results
          finalData = lowThresholdData;
        } else {
          console.log('[ExperienceService] No results even with threshold 0.1. Possible issues: no embeddings in DB, dimension mismatch, or very low similarity.');
          return [];
        }
      }

      // Apply offset and limit
      const paginatedData = finalData.slice(offset, offset + limit);

      // Fetch keywords for each experience
      const experienceIds = paginatedData.map((exp: any) => exp.id);
      const { data: keywordsData } = await this.supabaseClient
        .from('experience_keywords')
        .select('experience_id, keyword')
        .in('experience_id', experienceIds);

      // Map keywords to experiences
      const keywordsMap = new Map<string, string[]>();
      keywordsData?.forEach((item: { experience_id: string; keyword: string }) => {
        if (!keywordsMap.has(item.experience_id)) {
          keywordsMap.set(item.experience_id, []);
        }
        keywordsMap.get(item.experience_id)!.push(item.keyword);
      });

      // Transform results
      return paginatedData.map((record: any) => ({
        ...record,
        keywords: keywordsMap.get(record.id) || [],
        similarity: record.similarity
      })) as ExperienceRecord[];
    } catch (error) {
      console.error('Error in vector search:', error);
      return [];
    }
  }

  /**
   * Generate and update embedding for an experience
   */
  async updateExperienceEmbedding(experienceId: string): Promise<boolean> {
    try {
      // Get the experience
      const experience = await this.getExperienceById(experienceId);
      if (!experience) {
        console.error(`Experience not found: ${experienceId}`);
        return false;
      }

      // Generate embedding
      let embedding: number[];
      try {
        embedding = await this.embeddingService.generateExperienceEmbedding({
          title: experience.title,
          problem_description: experience.problem_description,
          solution: experience.solution,
          root_cause: experience.root_cause,
          context: experience.context,
          keywords: experience.keywords || []
        });
      } catch (error) {
        console.error('Failed to generate embedding:', error);
        throw error; // Re-throw to preserve error message
      }

      if (!embedding || embedding.length === 0) {
        console.error('Generated embedding is empty');
        return false;
      }

      console.log(`Generated embedding with ${embedding.length} dimensions for experience ${experienceId}`);

      // Update the embedding in database
      const { error: rpcError } = await this.supabaseClient.rpc('update_experience_embedding', {
        experience_id: experienceId,
        embedding_vector: embedding
      });

      if (rpcError) {
        console.warn('RPC update failed, trying direct update:', rpcError);
        // Fallback to direct update if RPC doesn't work
        const { error: updateError } = await this.supabaseClient
          .from('experience_records')
          .update({ 
            embedding,
            has_embedding: true
          })
          .eq('id', experienceId);

        if (updateError) {
          console.error('Failed to update embedding in database:', updateError);
          throw new Error(`Database update failed: ${updateError.message}`);
        }
      }

      console.log(`Successfully updated embedding for experience ${experienceId}`);
      return true;
    } catch (error) {
      console.error('Error updating embedding:', error);
      // Re-throw to preserve error message for API route
      throw error;
    }
  }

  async getPopularKeywords(limit: number = 10): Promise<string[]> {
    try {
      // 简单查询获取所有关键词，然后在客户端处理
      const { data, error } = await this.supabaseClient
        .from('experience_keywords')
        .select('keyword')
        .limit(100); // 获取足够多的关键词用于统计

      if (error) {
        console.error('Failed to get keywords:', error);
        return [];
      }

      // 在客户端统计关键词频率
      const keywordCount = new Map<string, number>();
      data?.forEach((item: { keyword: string }) => {
        keywordCount.set(item.keyword, (keywordCount.get(item.keyword) || 0) + 1);
      });

      // 按频率排序并返回前limit个
      return Array.from(keywordCount.entries())
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, limit)
        .map(([keyword]) => keyword);
    } catch (error) {
      console.error('Error in getPopularKeywords:', error);
      return [];
    }
  }
}