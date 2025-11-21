import { NextRequest, NextResponse } from 'next/server';
import { createApiKey, getUserApiKeys, validateApiKey } from '@/lib/services/apiKeyService';
import { getCurrentUser } from '@/lib/services/internal/authService';

export const runtime = process.env.NODE_ENV === 'production' ? 'edge' : 'nodejs';

// GET /api/api-keys - 获取用户的所有API密钥
export async function GET(request: NextRequest) {
  try {
    // 检查API密钥认证（用于程序访问）
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      const keyValidation = await validateApiKey(apiKey);
      if (!keyValidation) {
        return NextResponse.json(
          { message: '无效的API密钥' },
          { status: 401 }
        );
      }
      
      const apiKeys = await getUserApiKeys(keyValidation.userId);
      return NextResponse.json(apiKeys);
    }

    // 检查会话认证（用于用户界面访问）
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return NextResponse.json(
        { message: '未提供认证信息' },
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

    const apiKeys = await getUserApiKeys(user.id);
    return NextResponse.json(apiKeys);

  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - 创建新的API密钥
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { message: 'API密钥名称不能为空' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { message: 'API密钥名称不能超过100个字符' },
        { status: 400 }
      );
    }

    const apiKey = await createApiKey(user.id, {
      name: name.trim()
    });

    return NextResponse.json(apiKey, { status: 201 });

  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}