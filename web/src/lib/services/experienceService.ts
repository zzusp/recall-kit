import { Database } from '@/types/database';
import { EmbeddingService } from './embeddingService';
import { db } from '../db/client';

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

  constructor() {
    this.embeddingService = new EmbeddingService();
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

    // Fallback to traditional text search using PostgreSQL
    let sql = `
      SELECT 
        er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.status, er.query_count, er.view_count, 
        er.relevance_score, er.created_at, er.updated_at, er.deleted_at,
        COALESCE(
          json_agg(
            CASE WHEN ek.keyword IS NOT NULL THEN ek.keyword END
          ) FILTER (WHERE ek.keyword IS NOT NULL), 
          '[]'::json
        ) as keywords
      FROM experience_records er
      LEFT JOIN experience_keywords ek ON er.id = ek.experience_id
      WHERE er.status = 'published'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply text search if provided
    if (q.trim()) {
      const normalizedQuery = q.trim().toLowerCase();
      sql += ` AND (
        er.title ILIKE $${paramIndex} OR
        er.problem_description ILIKE $${paramIndex} OR
        er.solution ILIKE $${paramIndex} OR
        er.root_cause ILIKE $${paramIndex} OR
        er.context ILIKE $${paramIndex}
      )`;
      params.push(`%${normalizedQuery}%`);
      paramIndex++;
    }

    // Apply keyword filtering if provided
    if (keywords.length > 0) {
      sql += ` AND er.id IN (
        SELECT DISTINCT experience_id 
        FROM experience_keywords 
        WHERE keyword = ANY($${paramIndex})
      )`;
      params.push(keywords);
      paramIndex++;
    }

    // Group by
    sql += ` GROUP BY er.id`;

    // Apply sorting
    switch (sort) {
      case 'query_count':
        sql += ` ORDER BY er.query_count DESC NULLS LAST`;
        break;
      case 'created_at':
        sql += ` ORDER BY er.created_at DESC`;
        break;
      case 'relevance':
      default:
        sql += ` ORDER BY er.relevance_score DESC NULLS LAST, er.created_at DESC`;
        break;
    }

    // Add pagination
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Get experiences
    const experiencesResult = await db.query(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(DISTINCT er.id) as total
      FROM experience_records er
      WHERE er.status = 'published'
    `;
    
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (q.trim()) {
      const normalizedQuery = q.trim().toLowerCase();
      countSql += ` AND (
        er.title ILIKE $${countParamIndex} OR
        er.problem_description ILIKE $${countParamIndex} OR
        er.solution ILIKE $${countParamIndex} OR
        er.root_cause ILIKE $${countParamIndex} OR
        er.context ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${normalizedQuery}%`);
      countParamIndex++;
    }

    if (keywords.length > 0) {
      countSql += ` AND er.id IN (
        SELECT DISTINCT experience_id 
        FROM experience_keywords 
        WHERE keyword = ANY($${countParamIndex})
      )`;
      countParams.push(keywords);
    }

    const countResult = await db.query(countSql, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Transform the data
    const experiences = experiencesResult.rows.map(record => ({
      ...record,
      keywords: Array.isArray(record.keywords) ? record.keywords.filter(Boolean) : []
    }));

    return {
      experiences,
      totalCount,
      hasMore: (offset + limit) < totalCount
    };
  }

  async getExperienceById(id: string): Promise<ExperienceRecord | null> {
    const sql = `
      SELECT 
        er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.status, er.query_count, er.view_count, 
        er.relevance_score, er.created_at, er.updated_at, er.deleted_at,
        COALESCE(
          json_agg(
            CASE WHEN ek.keyword IS NOT NULL THEN ek.keyword END
          ) FILTER (WHERE ek.keyword IS NOT NULL), 
          '[]'::json
        ) as keywords
      FROM experience_records er
      LEFT JOIN experience_keywords ek ON er.id = ek.experience_id
      WHERE er.id = $1 AND er.status = 'published'
      GROUP BY er.id
    `;

    try {
      const result = await db.query(sql, [id]);
      if (result.rows.length === 0) {
        return null;
      }

      const record = result.rows[0];
      return {
        ...record,
        keywords: Array.isArray(record.keywords) ? record.keywords.filter(Boolean) : []
      };
    } catch (error) {
      throw new Error(`Failed to get experience: ${error}`);
    }
  }

  async incrementViewCount(experienceId: string): Promise<number> {
    try {
      // Try to use the increment_view_count function first
      try {
        const result = await db.query(
          'SELECT increment_view_count($1) as new_count',
          [experienceId]
        );
        return result.rows[0]?.new_count || 0;
      } catch (rpcError) {
        console.warn('RPC function not available, using manual update:', rpcError);
        
        // Fallback to manual update
        try {
          const result = await db.query(
            'UPDATE experience_records SET view_count = COALESCE(view_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING view_count',
            [experienceId]
          );
          return result.rows[0]?.view_count || 0;
        } catch (updateError) {
          // If view_count column doesn't exist, just return 0
          if (updateError instanceof Error && updateError.message.includes('does not exist')) {
            console.warn('view_count column does not exist, skipping update. Please run migration 005_add_view_count.sql');
            return 0;
          }
          throw updateError;
        }
      }
    } catch (error) {
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
        firstValue: queryEmbedding[0] // Only log first value instead of first few
      });

      // First, check how many experiences have embeddings
      const countResult = await db.query(
        'SELECT COUNT(*) as count FROM experience_records WHERE status = $1 AND embedding IS NOT NULL',
        ['published']
      );
      
      const embeddingCount = parseInt(countResult.rows[0].count);
      console.log('[ExperienceService] Experiences with embeddings:', { count: embeddingCount });

      // Call the RPC function for vector search
      // Lower threshold for bge-m3 model (0.3 instead of 0.5 to get more results)
      const matchThreshold = 0.3;
      console.log('[ExperienceService] Calling match_experiences_by_embedding RPC:', {
        match_threshold: matchThreshold,
        match_count: limit + offset,
        queryEmbeddingDimensions: queryEmbedding.length
      });
      
      let vectorResults: any[] = [];
      
      try {
      const vectorResult = await db.query(
        'SELECT * FROM match_experiences_by_embedding($1, $2, $3)',
        [`[${queryEmbedding.join(',')}]`, matchThreshold, limit + offset] // Convert to JSON array string
      );
        vectorResults = vectorResult.rows;
      } catch (error) {
        console.log('[ExperienceService] No results from vector search. Trying with lower threshold (0.1)...');
        try {
          const lowThresholdResult = await db.query(
            'SELECT * FROM match_experiences_by_embedding($1, $2, $3)',
            [`[${queryEmbedding.join(',')}]`, 0.1, limit + offset] // Convert to JSON array string
          );
          vectorResults = lowThresholdResult.rows;
          console.log('[ExperienceService] Found results with lower threshold (0.1):', {
            count: vectorResults.length,
            similarities: vectorResults.map((r: any) => r.similarity)
          });
        } catch (lowThresholdError) {
          console.log('[ExperienceService] No results even with threshold 0.1. Possible issues: no embeddings in DB, dimension mismatch, or very low similarity.');
          return [];
        }
      }

      if (vectorResults.length === 0) {
        return [];
      }

      // Apply offset and limit
      const paginatedData = vectorResults.slice(offset, offset + limit);

      // Fetch keywords for each experience
      const experienceIds = paginatedData.map((exp: any) => exp.id);
      const keywordsResult = await db.query(
        'SELECT experience_id, keyword FROM experience_keywords WHERE experience_id = ANY($1)',
        [experienceIds]
      );

      // Map keywords to experiences
      const keywordsMap = new Map<string, string[]>();
      keywordsResult.rows.forEach((item: { experience_id: string; keyword: string }) => {
        if (!keywordsMap.has(item.experience_id)) {
          keywordsMap.set(item.experience_id, []);
        }
        keywordsMap.get(item.experience_id)!.push(item.keyword);
      });

      // Transform results and remove embedding field
      return paginatedData.map((record: any) => {
        const { embedding, ...recordWithoutEmbedding } = record;
        return {
          ...recordWithoutEmbedding,
          keywords: keywordsMap.get(record.id) || [],
          similarity: record.similarity
        };
      }) as ExperienceRecord[];
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

      // Update embedding in database
      try {
        // Try RPC function first
        await db.query(
          'SELECT update_experience_embedding($1, $2)',
          [experienceId, `[${embedding.join(',')}]`] // Convert to JSON array string for PostgreSQL vector type
        );
      } catch (rpcError) {
        console.warn('RPC update failed, trying direct update:', rpcError);
        // Fallback to direct update
        await db.query(
          'UPDATE experience_records SET embedding = $1, has_embedding = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [`[${embedding.join(',')}]`, experienceId] // Convert to JSON array string for PostgreSQL vector type
        );
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
      // 查询获取所有关键词并统计频率
      const result = await db.query(`
        SELECT keyword, COUNT(*) as count 
        FROM experience_keywords 
        GROUP BY keyword 
        ORDER BY count DESC 
        LIMIT 100
      `);

      // 按频率排序并返回前limit个
      return result.rows
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(row => row.keyword);
    } catch (error) {
      console.error('Error in getPopularKeywords:', error);
      return [];
    }
  }
}