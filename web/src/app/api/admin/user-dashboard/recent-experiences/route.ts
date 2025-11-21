import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/services/internal/authService';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';
import { db } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户信息
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }

    const currentUser = await getCurrentUser(sessionToken);
    if (!currentUser) {
      return ApiRouteResponse.unauthorized('用户未登录');
    }

    // 获取用户最近的经验记录
    const query = `
      SELECT 
        er.id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.query_count, er.view_count, er.relevance_score, 
        er.has_embedding, er.created_at, er.updated_at, er.deleted_at,
        COALESCE(
          json_agg(
            CASE WHEN ek.keyword IS NOT NULL THEN ek.keyword END
          ) FILTER (WHERE ek.keyword IS NOT NULL), 
          '[]'::json
        ) as keywords
      FROM experience_records er
      LEFT JOIN experience_keywords ek ON er.id = ek.experience_id
      WHERE er.user_id = $1 AND er.is_deleted = false
      GROUP BY er.id
      ORDER BY er.updated_at DESC
      LIMIT 10
    `;

    const result = await db.query(query, [currentUser.id]);

    // 转换数据格式
    const experiences = result.rows.map(record => ({
      ...record,
      keywords: Array.isArray(record.keywords) ? record.keywords.filter(Boolean) : []
    }));

    return ApiRouteResponse.success({
      experiences,
      total: experiences.length
    });

  } catch (error) {
    console.error('Error fetching recent experiences:', error);
    return ApiRouteResponse.internalError('获取最近经验失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}