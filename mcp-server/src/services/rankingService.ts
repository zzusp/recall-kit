import { SupabaseClient } from '../lib/supabase';

export class RankingService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Calculate relevance score for search results
   * @param queryKeywords Keywords from the search query
   * @param experienceKeywords Keywords from the experience record
   * @param queryCount Number of times the experience has been queried
   * @param createdAt When the experience was created
   * @returns Relevance score between 0 and 1
   */
  calculateRelevanceScore(
    queryKeywords: string[],
    experienceKeywords: string[],
    queryCount: number,
    createdAt: Date
  ): number {
    // Calculate keyword match score (0-0.6)
    const keywordScore = this.calculateKeywordScore(queryKeywords, experienceKeywords);
    
    // Calculate popularity score based on query count (0-0.3)
    const popularityScore = this.calculatePopularityScore(queryCount);
    
    // Calculate recency score based on creation time (0-0.1)
    const recencyScore = this.calculateRecencyScore(createdAt);
    
    // Combine scores with weights
    return (keywordScore * 0.6) + (popularityScore * 0.3) + (recencyScore * 0.1);
  }

  private calculateKeywordScore(queryKeywords: string[], experienceKeywords: string[]): number {
    if (queryKeywords.length === 0 || experienceKeywords.length === 0) {
      return 0;
    }

    // Count matching keywords
    const matchedKeywords = experienceKeywords.filter(kw => 
      queryKeywords.some(qk => qk.toLowerCase() === kw.toLowerCase())
    ).length;

    // Normalize score based on number of matches
    return Math.min(matchedKeywords / queryKeywords.length, 1);
  }

  private calculatePopularityScore(queryCount: number): number {
    // Logarithmic scale to prevent domination by very popular items
    return Math.min(Math.log10(queryCount + 1) / 3, 1);
  }

  private calculateRecencyScore(createdAt: Date): number {
    // Score decreases linearly over 90 days
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (ageInDays / 90));
  }

  /**
   * Update relevance scores for a set of experiences based on a query
   * @param experienceIds IDs of experiences to update
   * @param queryKeywords Keywords from the search query
   */
  async updateRelevanceScores(experienceIds: string[], queryKeywords: string[]): Promise<void> {
    if (experienceIds.length === 0) return;

    // Get current data for the experiences
    const { data: experiences, error } = await this.supabase
      .from('experience_records')
      .select('id, query_count, created_at, experience_keywords:experience_keywords(keyword)')
      .in('id', experienceIds);

    if (error || !experiences) {
      console.error('Failed to fetch experiences for relevance update:', error?.message);
      return;
    }

    // Calculate and update scores
    const updates = experiences.map((exp: any) => {
      const keywords = (exp as any).experience_keywords?.map((k: any) => k.keyword) || [];
      const createdAt = new Date(exp.created_at);
      const score = this.calculateRelevanceScore(
        queryKeywords,
        keywords,
        exp.query_count,
        createdAt
      );

      return {
        id: exp.id,
        relevance_score: score
      };
    });

    // 使用update替代upsert，逐个更新记录
    for (const update of updates) {
      const { error: updateError } = await (this.supabase
        .from('experience_records') as any)
        .update({ relevance_score: update.relevance_score })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Failed to update relevance score for experience ${update.id}:`, updateError.message);
      }
    }
  }
}