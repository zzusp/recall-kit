import { SupabaseClient } from '../lib/supabase';
import { ExperienceService } from '../services/experienceService';
import { RankingService } from '../services/rankingService';

export interface QueryExperienceParams {
  keywords?: string[];
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

export interface QueryHandlerOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

export async function initQueryHandler(
  supabase: SupabaseClient,
  options?: QueryHandlerOptions,
) {
  const experienceService = new ExperienceService(supabase);
  const rankingService = new RankingService(supabase);
  const handlerDefaultLimit = Math.min(
    Math.max(options?.defaultLimit ?? 3, 1),
    options?.maxLimit ?? 100,
  );
  const handlerMaxLimit = Math.max(options?.maxLimit ?? 100, 1);

  return async function queryHandler(params: QueryExperienceParams): Promise<QueryExperienceResult> {
    try {
      const {
        keywords = [],
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

      console.log('Query parameters:', { keywords, limit, offset, sort });
      
      // Query experiences
      const experiences = await experienceService.queryExperiences({
        keywords,
        limit,
        offset,
        sort
      });
      
      console.log('Query results count:', experiences.length);

      // Update relevance scores based on this query (fire-and-forget, don't block response)
      if (keywords.length > 0) {
        // Use setImmediate to ensure this doesn't block the response
        setImmediate(() => {
          rankingService.updateRelevanceScores(
            experiences.map(exp => exp.id),
            keywords
          ).catch(error => {
            console.error('Failed to update relevance scores:', error);
          });
        });
      }

      // Update query counts asynchronously (fire-and-forget, don't block response)
      setImmediate(() => {
        experienceService.updateQueryCount(experiences.map(exp => exp.id))
          .catch(error => {
            console.error('Failed to update query counts:', error);
          });
      });

      // Transform response
      const result: QueryExperienceResult = {
        experiences: experiences.map(exp => ({
          id: exp.id,
          title: exp.title,
          problem_description: exp.problem_description,
          root_cause: exp.root_cause || undefined,
          solution: exp.solution,
          context: exp.context || undefined,
          keywords: exp.keywords || [],
          query_count: exp.query_count,
          relevance_score: exp.relevance_score || 0,
          created_at: exp.created_at
        })),
        total_count: experiences.length,
        has_more: experiences.length === limit
      };

      return result;

    } catch (error) {
      console.error('Query handler error:', error);
      throw new Error(`Failed to query experiences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
}