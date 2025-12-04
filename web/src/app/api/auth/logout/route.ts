import { NextRequest } from 'next/server';
import { auth, signOut } from '@/lib/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

/**
 * 退出登录 API
 * 使用 NextAuth.js 的 signOut 函数
 */
export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 的 signOut 方法
    await signOut({ redirect: false });
    
    return ApiRouteResponse.success(null, '退出登录成功');
  } catch (error) {
    console.error('Logout error:', error);
    return ApiRouteError.internal('服务器内部错误', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
