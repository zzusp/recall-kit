import { NextRequest } from 'next/server';
import { ExperienceService } from '@/lib/server/services/experience';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q') || '';
    const keywords = searchParams.getAll('keywords') || [];
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') as 'relevance' | 'query_count' | 'created_at' || 'relevance';

    // 使用 ExperienceService 的查询方法
    const experienceService = new ExperienceService();
    const result = await experienceService.queryExperiences({
      q: query,
      keywords: keywords,
      limit: limit,
      offset: offset,
      sort: sort,
      useVectorSearch: true
    });

    // 为公开搜索过滤敏感信息，只返回基本信息
    const filteredExperiences = result.experiences.map(exp => ({
      id: exp.id,
      title: exp.title,
      problem_description: exp.problem_description?.substring(0, 150) + (exp.problem_description?.length > 150 ? '...' : ''),
      keywords: exp.keywords,
      view_count: exp.view_count,
      created_at: exp.created_at,
      similarity: exp.similarity
    }));

    return ApiRouteResponse.success({
      experiences: filteredExperiences,
      totalCount: result.totalCount,
      hasMore: result.hasMore
    }, '搜索成功');

  } catch (error) {
    console.error('Error searching experiences:', error);
    return ApiRouteError.internal('搜索失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
