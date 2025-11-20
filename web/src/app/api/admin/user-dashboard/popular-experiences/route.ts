import { NextRequest } from 'next/server';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    // 获取热门经验（仅限已发布的公开经验）
    const query = `
      SELECT 
        er.id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.query_count, er.view_count, er.relevance_score, 
        er.has_embedding, er.created_at, er.updated_at, er.deleted_at,
        u.username as author_username,
        COALESCE(
          json_agg(
            CASE WHEN ek.keyword IS NOT NULL THEN ek.keyword END
          ) FILTER (WHERE ek.keyword IS NOT NULL), 
          '[]'::json
        ) as keywords
      FROM experience_records er
      LEFT JOIN experience_keywords ek ON er.id = ek.experience_id
      LEFT JOIN users u ON er.user_id = u.id
      WHERE er.publish_status = 'published' 
        AND er.is_deleted = false
      GROUP BY er.id, u.username
      ORDER BY (er.view_count * 0.7 + er.query_count * 0.3) DESC, er.created_at DESC
      LIMIT 10
    `;

    const result = await db.query(query);

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
    console.error('Error fetching popular experiences:', error);
    return ApiRouteResponse.internalError('获取热门经验失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}