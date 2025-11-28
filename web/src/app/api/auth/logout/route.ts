import { NextRequest } from 'next/server';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

/**
 * 退出登录 API
 * 注意：NextAuth.js 使用客户端 signOut 函数，这个路由主要用于向后兼容
 * 建议客户端直接使用 next-auth/react 的 signOut 函数
 */
export async function POST(request: NextRequest) {
  try {
    // NextAuth.js 的退出登录由客户端 signOut 函数处理
    // 这里返回成功响应以保持向后兼容
    return ApiRouteResponse.success(null, '退出登录成功');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Logout error:', error);
    }
    return ApiRouteResponse.internalError('服务器内部错误', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}