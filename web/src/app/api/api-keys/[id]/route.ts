import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyById, updateApiKey, deleteApiKey, validateApiKey } from '@/lib/server/services/apiKey';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
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
    const apiKey = await getApiKeyById(id);
    
    if (!apiKey) {
      return ApiRouteError.notFound('API密钥不存在');
    }

    // 验证API密钥是否属于当前用户
    if (apiKey.userId !== session.user.id) {
      return ApiRouteError.forbidden('无权访问此API密钥');
    }

    return ApiRouteResponse.success(apiKey, '获取API密钥成功');
  } catch (error) {
    console.error('Get API key error:', error);
    return ApiRouteError.internal('获取API密钥失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function PUT(
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
    const { name } = await request.json();

    // 验证必填字段
    if (!name || name.trim() === '') {
      return ApiRouteError.badRequest('API密钥名称不能为空');
    }

    if (name.length > 100) {
      return ApiRouteError.badRequest('API密钥名称不能超过100个字符');
    }

    const updatedKey = await updateApiKey(id, { name }, session.user.id);
    if (!updatedKey) {
      return ApiRouteError.notFound('API密钥不存在');
    }

    return ApiRouteResponse.success(updatedKey, '更新API密钥成功');
  } catch (error) {
    console.error('Update API key error:', error);
    return ApiRouteError.internal('更新API密钥失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function DELETE(
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
    const deleted = await deleteApiKey(id, session.user.id);
    
    if (!deleted) {
      return ApiRouteError.notFound('API密钥不存在');
    }

    return ApiRouteResponse.success(null, 'API密钥已删除');
  } catch (error) {
    console.error('Delete API key error:', error);
    return ApiRouteError.internal('删除API密钥失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
