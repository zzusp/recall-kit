import { SupabaseClient } from '../lib/supabase';
import { ExperienceService } from '../services/experienceService';
import { RankingService } from '../services/rankingService';

export interface SubmitExperienceParams {
  title: string;
  problem_description: string;
  root_cause?: string;
  solution: string;
  context?: string;
  keywords?: string[];
}

export interface SubmitExperienceResult {
  experience_id: string;
  status: 'success' | 'failed';
  error?: string;
}

export async function initSubmitHandler(supabase: SupabaseClient) {
  const experienceService = new ExperienceService(supabase);
  const rankingService = new RankingService(supabase);

  return async function submitHandler(params: SubmitExperienceParams): Promise<SubmitExperienceResult> {
    try {
      const {
        title,
        problem_description,
        root_cause,
        solution,
        context,
        keywords = []
      } = params;

      // Validate required fields
      if (!title || !problem_description || !solution) {
        throw new Error('Missing required fields: title, problem_description, solution');
      }

      // Validate title length
      if (title.length > 500) {
        throw new Error('Title must be 500 characters or less');
      }

      // Validate context if provided
      if (context && context.length > 10000) {
        throw new Error('Context must be 10000 characters or less');
      }

      // Create the experience record
      const experienceId = await experienceService.createExperience({
        title,
        problem_description,
        root_cause: root_cause || null,
        solution,
        context: context || null,
        user_id: null // Anonymous submission for now
      }, keywords);

      // Calculate initial relevance score
      if (keywords.length > 0) {
        await rankingService.updateRelevanceScores(
          [experienceId],
          keywords
        );
      }

      return {
        experience_id: experienceId,
        status: 'success'
      };

    } catch (error) {
      console.error('Submit handler error:', error);
      return {
        experience_id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to submit experience'
      };
    }
  };
}