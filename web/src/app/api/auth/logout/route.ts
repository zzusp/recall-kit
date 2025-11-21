import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return ApiRouteResponse.badRequest('未提供会话令牌');
    }

    // 删除session
    await db.query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );

    return ApiRouteResponse.success(null, '退出登录成功');

  } catch (error) {
    console.error('Logout error:', error);
    return ApiRouteResponse.internalError('服务器内部错误', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}