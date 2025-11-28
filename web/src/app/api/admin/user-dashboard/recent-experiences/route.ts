import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    
    const currentUser = session.user as any;
    
    if (!currentUser.id) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }

    // 获取用户最近的经验记录
    const query = `
      SELECT 
        er.id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.query_count, er.view_count, 
        er.has_embedding, er.created_at, er.updated_at, er.deleted_at,
        COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords
      FROM experience_records er
      WHERE er.user_id = $1 AND er.is_deleted = false
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