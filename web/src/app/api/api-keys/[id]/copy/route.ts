import { NextRequest, NextResponse } from 'next/server';
import { getFullApiKey } from '@/lib/server/services/apiKey';
import { getServerSession } from '@/lib/server/auth';

export const runtime = 'nodejs';

// GET /api/api-keys/[id]/copy - 获取完整的API密钥用于复制
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { message: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;
    const apiKey = await getFullApiKey(currentUser.id, id);
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API密钥不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(apiKey);

  } catch (error) {
    console.error('Get full API key error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}