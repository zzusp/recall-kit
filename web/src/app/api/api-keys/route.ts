import { NextRequest, NextResponse } from 'next/server';
import { createApiKey, getUserApiKeys } from '@/lib/server/services/apiKey';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 检查会话认证（用于用户界面访问）- 使用 NextAuth.js
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;
    const apiKeys = await getUserApiKeys(currentUser.id);
    return ApiRouteResponse.success(apiKeys, '获取API密钥列表成功');

  } catch (error) {
    console.error('Error fetching API keys:', error);
    return ApiRouteError.internal('获取API密钥列表失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;
    const { name } = await request.json();

    if (!name || name.trim() === '') {
      return ApiRouteError.badRequest('API密钥名称不能为空');
    }

    if (name.length > 100) {
      return ApiRouteError.badRequest('API密钥名称不能超过100个字符');
    }

    // 创建新的API密钥
    const newApiKey = await createApiKey(currentUser.id, { name });
    return ApiRouteResponse.success(newApiKey, 'API密钥创建成功');
  } catch (error) {
    console.error('Error creating API key:', error);
    return ApiRouteError.internal('创建API密钥失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
