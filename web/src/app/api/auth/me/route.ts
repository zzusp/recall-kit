import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { message: '未授权访问' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // 返回用户信息
    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      is_superuser: user.is_superuser,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get current user error:', error);
    }
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
