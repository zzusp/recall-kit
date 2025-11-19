export interface QueryExperienceParams {
  keywords?: string[];
  ids?: string[];
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'query_count' | 'created_at';
}

export interface QueryExperienceResult {
  experiences: Array<{
    id: string;
    title: string;
    problem_description: string;
    root_cause?: string;
    solution: string;
    context?: string;
    keywords: string[];
    query_count: number;
    relevance_score: number;
    created_at: string;
  }>;
  total_count: number;
  has_more: boolean;
}

import { sql } from '../lib/db/config';
import { EmbeddingService } from '../services/embeddingService';

export interface QueryHandlerOptions {
  defaultLimit?: number;
  maxLimit?: number;
  embeddingService?: EmbeddingService;
}

export interface QueryContext {
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function initQueryHandler(
  options?: QueryHandlerOptions,
) {
  const handlerDefaultLimit = Math.min(
    Math.max(options?.defaultLimit ?? 3, 1),
    options?.maxLimit ?? 100,
  );
  const handlerMaxLimit = Math.max(options?.maxLimit ?? 100, 1);

  return async function queryHandler(
    params: QueryExperienceParams, 
    context?: QueryContext
  ): Promise<QueryExperienceResult> {
    const startTime = Date.now();
    try {
      const {
        keywords = [],
        ids,
        limit = handlerDefaultLimit,
        offset = 0,
        sort = 'relevance'
      } = params;

      // Validate parameters
      if (limit < 1 || limit > handlerMaxLimit) {
        throw new Error(`Limit must be between 1 and ${handlerMaxLimit}`);
      }

      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      // Always have access to sql import, no need for pool check

      console.log('Query parameters:', { keywords, ids, limit, offset, sort });
      
      let experiences: any[] = [];
      let totalCount = 0;

      // Handle ID-based query
      if (ids && ids.length > 0) {
        const idQuery = `
          SELECT 
            id,
            title,
            problem_description,
            root_cause,
            solution,
            context,
            query_count,
            relevance_score,
            created_at,
            (SELECT COALESCE(array_agg(keyword ORDER BY keyword), ARRAY[]::TEXT[]) 
             FROM experience_keywords ek WHERE ek.experience_id = er.id) as keywords
          FROM experience_records er
          WHERE er.id = ANY($1)
            AND er.publish_status = 'published'
            AND er.is_deleted = false
          ORDER BY ${getOrderByClause(sort)}
          LIMIT $2 OFFSET $3
        `;
        
        const result = await sql.unsafe(idQuery, [ids, limit + 1, offset]);
        experiences = result;
        
        // Get total count for ID query
        const countQuery = `
          SELECT COUNT(*) as count
          FROM experience_records er
          WHERE er.id = ANY($1)
            AND er.publish_status = 'published'
            AND er.is_deleted = false
        `;
        const countResult = await sql.unsafe(countQuery, [ids]);
        totalCount = parseInt(countResult[0].count);
        
      } else if (keywords && keywords.length > 0) {
        // Handle keyword-based vector search
        if (!options?.embeddingService) {
          throw new Error('Embedding service not configured for keyword search');
        }

        // Check if embedding service is available
        const isAvailable = await options.embeddingService.isAvailable();
        if (!isAvailable) {
          console.warn('Embedding service not available, falling back to text search');
          experiences = await performTextSearch(keywords, sort, limit + 1, offset);
          totalCount = await getTextSearchCount(keywords);
        } else {
          experiences = await performVectorSearch(options.embeddingService, keywords, sort, limit + 1, offset);
          totalCount = await getVectorSearchCount(options.embeddingService, keywords);
        }
      } else {
        // Handle empty query - return recent experiences
        experiences = await performEmptyQuery(sort, limit + 1, offset);
        totalCount = await getEmptyQueryCount();
      }

      const responseTime = Date.now() - startTime;
      console.log('Query results count:', experiences.length, 'Response time:', responseTime + 'ms');

      // Transform response and handle pagination
      const hasMore = experiences.length > limit;
      if (hasMore) {
        experiences = experiences.slice(0, limit);
      }

      const result: QueryExperienceResult = {
        experiences: experiences.map(exp => ({
          id: exp.id,
          title: exp.title,
          problem_description: exp.problem_description,
          root_cause: exp.root_cause,
          solution: exp.solution,
          context: exp.context,
          keywords: exp.keywords || [],
          query_count: exp.query_count || 0,
          relevance_score: exp.relevance_score || 0,
          created_at: exp.created_at,
          similarity: exp.similarity
        })),
        total_count: totalCount,
        has_more: hasMore
      };

      return result;

    } catch (error) {
      console.error('Query handler error:', error);
      throw new Error(`Failed to query experiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
}

// Helper functions for different query types

function getOrderByClause(sort: string): string {
  switch (sort) {
    case 'query_count':
      return 'er.query_count DESC, er.created_at DESC';
    case 'created_at':
      return 'er.created_at DESC';
    case 'relevance':
    default:
      return 'er.relevance_score DESC, er.created_at DESC';
  }
}

async function performVectorSearch(
  embeddingService: EmbeddingService,
  keywords: string[],
  sort: string,
  limit: number,
  offset: number
): Promise<any[]> {
  // Generate query embedding from keywords
  const queryText = keywords.join(' ');
  const queryEmbedding = await embeddingService.generateEmbedding(queryText);
  
  if (!queryEmbedding || queryEmbedding.length === 0) {
    console.warn('Failed to generate query embedding, falling back to text search');
    return await performTextSearch(keywords, sort, limit, offset);
  }

  // Perform vector similarity search
  let query = `
    SELECT 
      er.id,
      er.title,
      er.problem_description,
      er.root_cause,
      er.solution,
      er.context,
      er.query_count,
      er.relevance_score,
      er.created_at,
      (SELECT COALESCE(array_agg(keyword ORDER BY keyword), ARRAY[]::TEXT[]) 
       FROM experience_keywords ek WHERE ek.experience_id = er.id) as keywords,
      1 - (er.embedding <=> $1) as similarity
    FROM experience_records er
    WHERE er.publish_status = 'published'
      AND er.is_deleted = false
      AND er.embedding IS NOT NULL
      AND 1 - (er.embedding <=> $1) > 0.3
    ORDER BY ${sort === 'relevance' ? 'er.embedding <=> $1' : getOrderByClause(sort)}
    LIMIT $2 OFFSET $3
  `;

  const result = await sql.unsafe(query, [`[${queryEmbedding.join(',')}]`, limit, offset]);
  return result;
}

async function getVectorSearchCount(
  embeddingService: EmbeddingService,
  keywords: string[]
): Promise<number> {
  const queryText = keywords.join(' ');
  const queryEmbedding = await embeddingService.generateEmbedding(queryText);
  
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return await getTextSearchCount(keywords);
  }

  const query = `
    SELECT COUNT(*) as count
    FROM experience_records er
    WHERE er.publish_status = 'published'
      AND er.is_deleted = false
      AND er.embedding IS NOT NULL
      AND 1 - (er.embedding <=> $1) > 0.3
  `;

  const result = await sql.unsafe(query, [`[${queryEmbedding.join(',')}]`]);
  return parseInt(result[0].count);
}

async function performTextSearch(
  keywords: string[],
  sort: string,
  limit: number,
  offset: number
): Promise<any[]> {
  const searchTerm = keywords.join(' & ');
  
  const query = `
    SELECT 
      er.id,
      er.title,
      er.problem_description,
      er.root_cause,
      er.solution,
      er.context,
      er.query_count,
      er.relevance_score,
      er.created_at,
      (SELECT COALESCE(array_agg(keyword ORDER BY keyword), ARRAY[]::TEXT[]) 
       FROM experience_keywords ek WHERE ek.experience_id = er.id) as keywords,
      ts_rank_cd(er.fts, plainto_tsquery('english', $1)) as similarity
    FROM experience_records er
    WHERE er.publish_status = 'published'
      AND er.is_deleted = false
      AND er.fts @@ plainto_tsquery('english', $1)
    ORDER BY ${sort === 'relevance' ? 'similarity DESC' : getOrderByClause(sort)}
    LIMIT $2 OFFSET $3
  `;

  const result = await sql.unsafe(query, [searchTerm, limit, offset]);
  return result;
}

async function getTextSearchCount(
  keywords: string[]
): Promise<number> {
  const searchTerm = keywords.join(' & ');
  
  const query = `
    SELECT COUNT(*) as count
    FROM experience_records er
    WHERE er.publish_status = 'published'
      AND er.is_deleted = false
      AND er.fts @@ plainto_tsquery('english', $1)
  `;

  const result = await sql.unsafe(query, [searchTerm]);
  return parseInt(result[0].count);
}

async function performEmptyQuery(
  sort: string,
  limit: number,
  offset: number
): Promise<any[]> {
  const query = `
    SELECT 
      er.id,
      er.title,
      er.problem_description,
      er.root_cause,
      er.solution,
      er.context,
      er.query_count,
      er.relevance_score,
      er.created_at,
      (SELECT COALESCE(array_agg(keyword ORDER BY keyword), ARRAY[]::TEXT[]) 
       FROM experience_keywords ek WHERE ek.experience_id = er.id) as keywords
    FROM experience_records er
    WHERE er.publish_status = 'published'
      AND er.is_deleted = false
    ORDER BY ${getOrderByClause(sort)}
    LIMIT $1 OFFSET $2
  `;

  const result = await sql.unsafe(query, [limit, offset]);
  return result;
}

async function getEmptyQueryCount(): Promise<number> {
  const query = `
    SELECT COUNT(*) as count
    FROM experience_records er
    WHERE er.publish_status = 'published'
      AND er.is_deleted = false
  `;

  const result = await sql.unsafe(query);
  return parseInt(result[0].count);
}