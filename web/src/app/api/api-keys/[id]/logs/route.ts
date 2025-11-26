import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyUsageLogs, getApiKeyUsageStats, validateApiKey } from '@/lib/server/services/apiKey';
import { getCurrentUser } from '@/lib/server/services/auth';

export const runtime = 'nodejs';

// GET /api/api-keys/[id]/logs - 获取API密钥使用日志
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to get the id
    const { id } = await params;
    
    // 检查API密钥认证
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      const keyValidation = await validateApiKey(apiKey);
      if (!keyValidation) {
        return NextResponse.json(
          { message: '无效的API密钥' },
          { status: 401 }
        );
      }
      
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      const includeStats = searchParams.get('includeStats') === 'true';

      if (limit > 100) {
        return NextResponse.json(
          { message: 'limit不能超过100' },
          { status: 400 }
        );
      }

      const logs = await getApiKeyUsageLogs(keyValidation.userId, id, limit, offset);
      
      let response: { logs: any[]; stats?: any } = { logs };
      if (includeStats) {
        const stats = await getApiKeyUsageStats(keyValidation.userId, id);
        response = { logs, stats };
      }
      
      return NextResponse.json(response);
    }

    // 检查会话认证
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeStats = searchParams.get('includeStats') === 'true';

    if (limit > 100) {
      return NextResponse.json(
        { message: 'limit不能超过100' },
        { status: 400 }
      );
    }

    const logs = await getApiKeyUsageLogs(user.id, id, limit, offset);
    
    let response: { logs: any[]; stats?: any } = { logs };
    if (includeStats) {
      const stats = await getApiKeyUsageStats(user.id, id);
      response = { logs, stats };
    }
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Get API key logs error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}