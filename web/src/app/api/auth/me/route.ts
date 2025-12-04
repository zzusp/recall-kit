import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

/**
 * 获取当前用户信息 API
 * 使用 NextAuth.js 的会话管理
 */
export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    
    if (!session) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    // 返回用户信息
    return ApiRouteResponse.success(session.user, '获取用户信息成功');

  } catch (error) {
    console.error('Error getting user info:', error);
    return ApiRouteError.internal('服务器内部错误', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
