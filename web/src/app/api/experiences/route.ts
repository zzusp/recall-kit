import { NextRequest } from 'next/server';
import { ExperienceService } from '@/lib/server/services/experience';
import { ApiRouteResponse, ErrorResponses } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';
import { getServerSession } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const q = searchParams.get('q') || undefined;
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = (searchParams.get('sort') as 'relevance' | 'query_count' | 'created_at') || 'relevance';
    const useVectorSearch = searchParams.get('useVectorSearch') !== 'false';

    const experienceService = new ExperienceService();
    const result = await experienceService.queryExperiences({
      q,
      keywords,
      limit,
      offset,
      sort,
      useVectorSearch
    });

    // 批量更新返回的经验记录的 query_count（工具调用查询时使用）
    // 异步执行，不阻塞响应
    if (result.experiences && result.experiences.length > 0) {
      const experienceIds = result.experiences.map(exp => exp.id);
      experienceService.incrementQueryCount(experienceIds).catch(error => {
        console.error('Error incrementing query count:', error);
      });
    }

    // 使用统一响应格式
    return ApiRouteResponse.success(result);
  } catch (error) {
    console.error('Error in experiences API:', error);
    return ApiRouteResponse.internalError('Failed to fetch experiences', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const user = session.user as any;

    const body = await request.json();
    
    // TODO: Add proper validation
    const { title, problem_description, solution, root_cause, context, keywords } = body;

    // 验证必填字段
    if (!title || !problem_description || !solution) {
      return ApiRouteResponse.badRequest('Title, problem description, and solution are required');
    }
    
    // Insert new experience with draft publish status
    // Keywords are now stored directly in the experience_records table
    const keywordsArray = keywords && Array.isArray(keywords) ? keywords : [];
    const result = await db.query(
      `INSERT INTO experience_records 
       (user_id, title, problem_description, solution, root_cause, context, keywords, publish_status, is_deleted, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', false, NOW(), NOW())
       RETURNING id, user_id, title, problem_description, root_cause, 
                solution, context, keywords, publish_status, is_deleted,
                query_count, view_count, created_at, updated_at, deleted_at`,
      [
        user.id,
        title,
        problem_description,
        solution,
        root_cause,
        context,
        keywordsArray
      ]
    );

    const experience = result.rows[0];

    return ApiRouteResponse.success(experience, 'Experience created successfully', 201);
  } catch (error) {
    console.error('Error creating experience:', error);
    return ApiRouteResponse.internalError('Failed to create experience', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}