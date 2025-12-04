import { NextRequest, NextResponse } from 'next/server';
import { getFullApiKey } from '@/lib/server/services/apiKey';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const { id } = await params;
    const apiKey = await getFullApiKey(session.user.id, id);
    
    if (!apiKey) {
      return ApiRouteError.notFound('API密钥不存在');
    }

    // 验证API密钥是否属于当前用户
    if (apiKey.userId !== session.user.id) {
      return ApiRouteError.forbidden('无权访问此API密钥');
    }

    // 创建一个新的API密钥用于复制
    const newApiKey = {
      ...apiKey,
      name: `${apiKey.name} (副本)`,
    };

    return ApiRouteResponse.success(newApiKey, 'API密钥复制成功');
  } catch (error) {
    console.error('Copy API key error:', error);
    return ApiRouteError.internal('复制API密钥失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
