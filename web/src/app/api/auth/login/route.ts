import { NextRequest, NextResponse } from 'next/server';
import { signIn, auth } from '@/lib/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * 登录 API
 * 使用 NextAuth.js 的 signIn 函数进行认证
 */
export async function POST(request: NextRequest) {
  try {
    const credentials: LoginCredentials = await request.json();

    if (!credentials.username || !credentials.password) {
      return ApiRouteError.badRequest('用户名和密码不能为空');
    }

    // 使用 NextAuth.js 的 signIn 方法
    // 这会触发 Credentials Provider 的 authorize 函数
    const result = await signIn('credentials', {
      username: credentials.username,
      password: credentials.password,
      redirect: false, // 不重定向，返回响应
    });

    if (!result || result.error) {
      return ApiRouteError.unauthorized('用户名或密码错误');
    }

    // 获取登录后的会话信息（包含角色和权限）
    const session = await auth();
    
    if (!session?.user) {
      return ApiRouteError.unauthorized('登录失败，请重试');
    }

    return ApiRouteResponse.success(session.user, '登录成功');

  } catch (error) {
    console.error('Login error:', error);
    return ApiRouteError.internal('登录失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
