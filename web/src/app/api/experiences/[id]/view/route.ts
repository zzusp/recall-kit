import { NextRequest } from 'next/server';
import { ExperienceService } from '@/lib/server/services/experience';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';

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
      return ApiRouteResponse.badRequest('Experience ID is required');
    }

    const experienceService = new ExperienceService();
    
    // 尝试增加查看次数，失败不影响主功能
    // incrementViewCount 内部已处理错误，失败时返回 0
    const newCount = await experienceService.incrementViewCount(id);
    
    // 即使更新失败（newCount 为 0），也返回成功响应
    // 避免影响前端功能，前端可以根据 newCount 是否为 0 判断是否更新成功
    return ApiRouteResponse.success({ newCount }, 'View count incremented successfully');
  } catch (error) {
    // 捕获未预期的错误，但仍返回成功响应，确保不影响主功能
    console.error('Unexpected error in view count API (non-blocking):', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    // 返回成功响应，但 newCount 为 0 表示更新失败
    return ApiRouteResponse.success({ newCount: 0 }, 'View count update attempted');
  }
}