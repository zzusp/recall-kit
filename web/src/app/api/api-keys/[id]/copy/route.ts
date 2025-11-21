import { NextRequest, NextResponse } from 'next/server';
import { getFullApiKey } from '@/lib/services/apiKeyService';
import { getCurrentUser } from '@/lib/services/internal/authService';


// GET /api/api-keys/[id]/copy - 获取完整的API密钥用于复制
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return NextResponse.json(
        { message: '未提供会话令牌' },
        { status: 401 }
      );
    }

    const user = await getCurrentUser(sessionToken);
    if (!user) {
      return NextResponse.json(
        { message: '无效的会话令牌' },
        { status: 401 }
      );
    }

    const apiKey = await getFullApiKey(user.id, id);
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