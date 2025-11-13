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

export async function initQueryHandler(supabase: SupabaseClient) {
  const experienceService = new ExperienceService(supabase);
  const rankingService = new RankingService(supabase);

  return async function queryHandler(params: QueryExperienceParams): Promise<QueryExperienceResult> {
    try {
      const {
        keywords = [],
        limit = 10,
        offset = 0,
        sort = 'relevance'
      } = params;

      // Validate parameters
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
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

      // Update relevance scores based on this query
      if (keywords.length > 0) {
        rankingService.updateRelevanceScores(
          experiences.map(exp => exp.id),
          keywords
        ).catch(error => {
          console.error('Failed to update relevance scores:', error);
        });
      }

      // Update query counts asynchronously
      experienceService.updateQueryCount(experiences.map(exp => exp.id))
        .catch(error => {
          console.error('Failed to update query counts:', error);
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