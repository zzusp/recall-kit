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

    // 获取用户的经验统计
    const statsQuery = `
      SELECT 
        COUNT(*) as my_experiences,
        COUNT(CASE WHEN er.publish_status = 'published' AND er.is_deleted = false THEN 1 END) as published_experiences,
        COUNT(CASE WHEN er.publish_status = 'draft' AND er.is_deleted = false THEN 1 END) as draft_experiences,
        COALESCE(SUM(er.view_count), 0) as total_views,
        COALESCE(SUM(er.query_count), 0) as total_queries,
        COUNT(CASE WHEN er.updated_at >= NOW() - INTERVAL '7 days' AND er.is_deleted = false THEN 1 END) as recently_updated
      FROM experience_records er
      WHERE er.user_id = $1
    `;

    const result = await db.query(statsQuery, [currentUser.id]);
    const stats = result.rows[0];

    return ApiRouteResponse.success({
      myExperiences: parseInt(stats.my_experiences),
      publishedExperiences: parseInt(stats.published_experiences),
      draftExperiences: parseInt(stats.draft_experiences),
      totalViews: parseInt(stats.total_views),
      totalQueries: parseInt(stats.total_queries),
      recentlyUpdated: parseInt(stats.recently_updated),
    });

  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    return ApiRouteResponse.internalError('获取统计数据失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}