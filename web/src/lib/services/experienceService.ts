import { supabase } from '../supabase/client';
import { Database } from '@/types/database';

export type ExperienceRecord = Database['public']['Tables']['experience_records']['Row'] & {
  keywords?: string[];
};

export interface QueryOptions {
  q?: string;
  keywords?: string[];
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'query_count' | 'created_at';
}

export class ExperienceService {
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
      sort = 'relevance'
    } = options;

    let query = supabase
      .from('experience_records')
      .select(`
        *,
        experience_keywords:experience_keywords(keyword)
      `, { count: 'exact' })
      .eq('status', 'published')
      .range(offset, offset + limit - 1);

    // Apply text search if provided
    if (q.trim()) {
      query = query.textSearch('fts', q, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Apply keyword filtering if provided
    if (keywords.length > 0) {
      const { data: keywordMatches } = await supabase
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
    const experiences = (data || []).map(record => ({
      ...record as ExperienceRecord,
      keywords: (record as any).experience_keywords?.map((k: any) => k.keyword) || []
    }));

    return {
      experiences,
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    };
  }

  async getExperienceById(id: string): Promise<ExperienceRecord | null> {
    const { data, error } = await supabase
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

  async getPopularKeywords(limit: number = 10): Promise<string[]> {
    try {
      // 简单查询获取所有关键词，然后在客户端处理
      const { data, error } = await supabase
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