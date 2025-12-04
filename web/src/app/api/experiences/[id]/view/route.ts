import { NextRequest } from 'next/server';
import { ExperienceService } from '@/lib/server/services/experience';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
import { getServerSession } from '@/lib/server/auth';

export const runtime = 'nodejs';

interface Params {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    // Next.js 15 requires params to be awaited
    const { id } = await params;
    if (!id) {
      return ApiRouteError.badRequest('Experience ID is required');
    }

    // 必须登录才能查看经验
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('请先登录后查看经验');
    }
    
    const experienceService = new ExperienceService();
    const experience = await experienceService.getExperienceById(id, session.user.id);
    
    if (!experience) {
      return ApiRouteError.notFound('经验记录不存在');
    }
    
    // 尝试增加浏览次数，失败不影响主功能
    await experienceService.incrementViewCount(id);

    return ApiRouteResponse.success(null, 'View count incremented successfully');
    
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return ApiRouteError.internal('Failed to increment view count', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
