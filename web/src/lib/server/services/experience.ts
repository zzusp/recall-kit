import { Database } from '@/types/database/index';
import { EmbeddingService } from './embedding';
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
      
      if (isAvailable) {
        try {
          const vectorResults = await this.queryByVector(q, limit, offset);
          
          if (vectorResults && vectorResults.length > 0) {
            // Apply keyword filtering if provided
            let filteredResults = vectorResults;
            if (keywords.length > 0) {
              filteredResults = vectorResults.filter(exp => 
                exp.keywords && keywords.some(k => exp.keywords!.includes(k))
              );
            }

            return {
              experiences: filteredResults,
              totalCount: filteredResults.length,
              hasMore: false // Vector search doesn't support pagination easily
            };
          }
        } catch (error) {
          console.warn('[ExperienceService] Vector search failed, falling back to text search:', error);
          // Fall through to text search
        }
      }
    }

    // Fallback to traditional text search using PostgreSQL
    let sql = `
      SELECT 
        er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.query_count, er.view_count, er.created_at, 
        er.updated_at, er.deleted_at,
        COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords
      FROM experience_records er
      WHERE er.publish_status = 'published' AND er.is_deleted = false
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
      sql += ` AND er.keywords && $${paramIndex}::TEXT[]`;
      params.push(keywords);
      paramIndex++;
    }

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
        // Relevance is calculated dynamically in vector search as 'similarity'
        // For text search, we use query_count and created_at for sorting
        sql += ` ORDER BY er.query_count DESC, er.created_at DESC`;
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
      WHERE er.publish_status = 'published' AND er.is_deleted = false
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
      countSql += ` AND er.keywords && $${countParamIndex}::TEXT[]`;
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
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.query_count, er.view_count, er.created_at, 
        er.updated_at, er.deleted_at,
        COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords
      FROM experience_records er
      WHERE er.id = $1 AND er.publish_status = 'published' AND er.is_deleted = false
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
  /**
   * 增加查看次数（用户点击查看时使用）
   * 使用原子操作确保并发安全，失败不影响主功能
   * @param experienceId 经验记录ID
   * @returns 更新后的查看次数，失败时返回0
   */
  async incrementViewCount(experienceId: string): Promise<number> {
    if (!experienceId) {
      return 0;
    }

    try {
      // 使用原子操作更新 view_count
      // COALESCE 和 +1 操作在 PostgreSQL 中是原子的，确保并发安全
      // 只更新已发布且未删除的记录
      const result = await db.query(
        `UPDATE experience_records 
         SET view_count = COALESCE(view_count, 0) + 1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
           AND publish_status = 'published' 
           AND is_deleted = false 
         RETURNING view_count`,
        [experienceId]
      );
      
      return result.rows[0]?.view_count || 0;
    } catch (error) {
      // 静默处理错误，确保不影响主功能
      // 记录错误但不抛出异常
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.warn('view_count column does not exist, skipping update. Please run migration 005_add_view_count.sql');
      } else {
        console.error('Error in incrementViewCount (non-blocking):', {
          error: error instanceof Error ? error.message : String(error),
          experienceId,
          timestamp: new Date().toISOString()
        });
      }
      return 0;
    }
  }

  /**
   * 批量增加查询次数（工具调用查询时使用）
   * 使用原子操作确保并发安全，失败不影响主功能
   * @param experienceIds 经验记录ID数组
   */
  async incrementQueryCount(experienceIds: string[]): Promise<void> {
    if (!experienceIds || experienceIds.length === 0) {
      return;
    }

    // 去重，避免同一个ID被多次更新
    const uniqueIds = Array.from(new Set(experienceIds));
    if (uniqueIds.length === 0) {
      return;
    }

    try {
      // 使用原子操作批量更新 query_count
      // COALESCE 和 +1 操作在 PostgreSQL 中是原子的，确保并发安全
      // 只更新已发布且未删除的记录
      await db.query(
        `UPDATE experience_records 
         SET query_count = COALESCE(query_count, 0) + 1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ANY($1::uuid[]) 
           AND publish_status = 'published' 
           AND is_deleted = false`,
        [uniqueIds]
      );
    } catch (error) {
      // 静默处理错误，确保不影响主功能
      // 记录错误但不抛出异常
      console.error('Error in incrementQueryCount (non-blocking):', {
        error: error instanceof Error ? error.message : String(error),
        experienceIdsCount: uniqueIds.length,
        timestamp: new Date().toISOString()
      });
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
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(queryText);
      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('[ExperienceService] Failed to generate query embedding');
        return [];
      }

      // Call the RPC function for vector search
      // Lower threshold for bge-m3 model (0.3 instead of 0.5 to get more results)
      const matchThreshold = 0.3;
      
      let vectorResults: any[] = [];
      
      try {
      const vectorQuery = `
        SELECT 
          er.id,
          er.title,
          er.problem_description,
          er.root_cause,
          er.solution,
          er.context,
          er.publish_status,
          er.query_count,
          er.view_count,
          COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords,
          1 - (er.embedding <=> $1) as similarity,
          er.created_at,
          er.updated_at
        FROM experience_records er
        WHERE er.publish_status = 'published'
          AND er.embedding IS NOT NULL
          AND 1 - (er.embedding <=> $1) > $2
        ORDER BY er.embedding <=> $1
        LIMIT $3
      `;
      
      const vectorResult = await db.query(
        vectorQuery,
        [`[${queryEmbedding.join(',')}]`, matchThreshold, limit + offset]
      );
        vectorResults = vectorResult.rows;
      } catch (error) {
        // Try with lower threshold (0.1) if no results
        try {
          const lowThresholdQuery = `
            SELECT 
              er.id,
              er.title,
              er.problem_description,
              er.root_cause,
              er.solution,
              er.context,
              er.publish_status,
              er.query_count,
              er.view_count,
              COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords,
              1 - (er.embedding <=> $1) as similarity,
              er.created_at,
              er.updated_at
            FROM experience_records er
            WHERE er.publish_status = 'published'
              AND er.embedding IS NOT NULL
              AND 1 - (er.embedding <=> $1) > $2
            ORDER BY er.embedding <=> $1
            LIMIT $3
          `;
          
          const lowThresholdResult = await db.query(
            lowThresholdQuery,
            [`[${queryEmbedding.join(',')}]`, 0.1, limit + offset]
          );
          vectorResults = lowThresholdResult.rows;
        } catch (lowThresholdError) {
          return [];
        }
      }

      if (vectorResults.length === 0) {
        return [];
      }

      // Apply offset and limit
      const paginatedData = vectorResults.slice(offset, offset + limit);

      // Transform results and remove embedding field
      // Keywords are already included in the query result
      return paginatedData.map((record: any) => {
        const { embedding, ...recordWithoutEmbedding } = record;
        return {
          ...recordWithoutEmbedding,
          keywords: Array.isArray(record.keywords) ? record.keywords : [],
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

      // Update embedding in database using direct SQL
      await db.query(
        'UPDATE experience_records SET embedding = $1, has_embedding = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [`[${embedding.join(',')}]`, experienceId] // Convert to JSON array string for PostgreSQL vector type
      );

      return true;
    } catch (error) {
      console.error('Error updating embedding:', error);
      // Re-throw to preserve error message for API route
      throw error;
    }
  }

  /**
   * 获取热门经验（基于查看次数和查询次数）
   */
  async getPopularExperiences(limit: number = 6): Promise<ExperienceRecord[]> {
    try {
      const sql = `
        SELECT 
          er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
          er.solution, er.context, er.publish_status, er.is_deleted,
          er.query_count, er.view_count, er.created_at, 
          er.updated_at, er.deleted_at,
          COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords
        FROM experience_records er
        WHERE er.publish_status = 'published' AND er.is_deleted = false
        ORDER BY (er.view_count * 0.7 + er.query_count * 0.3) DESC, er.created_at DESC
        LIMIT $1
      `;

      const result = await db.query(sql, [limit]);
      
      return result.rows.map(record => ({
        ...record,
        keywords: Array.isArray(record.keywords) ? record.keywords.filter(Boolean) : []
      })) as ExperienceRecord[];
    } catch (error) {
      console.error('Error in getPopularExperiences:', error);
      return [];
    }
  }

  /**
   * 获取平台统计数据
   */
  async getPlatformStats(): Promise<{
    totalExperiences: number;
    totalViews: number;
    totalQueries: number;
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_experiences,
          COALESCE(SUM(view_count), 0) as total_views,
          COALESCE(SUM(query_count), 0) as total_queries
        FROM experience_records
        WHERE publish_status = 'published' AND is_deleted = false
      `);

      const row = result.rows[0];
      return {
        totalExperiences: parseInt(row.total_experiences) || 0,
        totalViews: parseInt(row.total_views) || 0,
        totalQueries: parseInt(row.total_queries) || 0
      };
    } catch (error) {
      console.error('Error in getPlatformStats:', error);
      return {
        totalExperiences: 0,
        totalViews: 0,
        totalQueries: 0
      };
    }
  }
}