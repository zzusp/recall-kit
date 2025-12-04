import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }
    
    const currentUser = session.user as any;
    
    if (!currentUser.id) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    // 获取用户统计数据
    const [
      totalExperiencesResult,
      publishedExperiencesResult,
      draftExperiencesResult,
      totalViewsResult,
      totalQueriesResult
    ] = await Promise.all([
      // 总经验数
      db.query('SELECT COUNT(*) as count FROM experience_records WHERE user_id = $1', [currentUser.id]),
      // 已发布经验数
      db.query('SELECT COUNT(*) as count FROM experience_records WHERE user_id = $1 AND publish_status = $2', [currentUser.id, 'published']),
      // 草稿经验数
      db.query('SELECT COUNT(*) as count FROM experience_records WHERE user_id = $1 AND publish_status = $2', [currentUser.id, 'draft']),
      // 总查看数
      db.query('SELECT SUM(view_count) as total FROM experience_records WHERE user_id = $1', [currentUser.id]),
      // 总查询数
      db.query('SELECT SUM(query_count) as total FROM experience_records WHERE user_id = $1', [currentUser.id])
    ]);

    const stats = {
      totalExperiences: parseInt(totalExperiencesResult.rows[0].count),
      publishedExperiences: parseInt(publishedExperiencesResult.rows[0].count),
      draftExperiences: parseInt(draftExperiencesResult.rows[0].count),
      totalViews: parseInt(totalViewsResult.rows[0].total) || 0,
      totalQueries: parseInt(totalQueriesResult.rows[0].total) || 0
    };

    return ApiRouteResponse.success(stats);

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return ApiRouteError.internal('获取用户统计失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
