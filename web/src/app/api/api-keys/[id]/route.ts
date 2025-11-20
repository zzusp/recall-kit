import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyById, updateApiKey, deleteApiKey, validateApiKey } from '@/lib/services/apiKeyService';
import { getCurrentUser } from '@/lib/services/internal/authService';
// GET /api/api-keys/[id] - 获取特定API密钥信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    const apiKey = await getApiKeyById(user.id, id);
    if (!apiKey) {
      return NextResponse.json(
        { message: 'API密钥不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(apiKey);

  } catch (error) {
    console.error('Get API key error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}


// PUT /api/api-keys/[id] - 更新API密钥信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to get the id
    const { id } = await params;
    
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
    const { name, isActive } = body;

    if (name !== undefined) {
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
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedKey = await updateApiKey(user.id, id, updates);
    if (!updatedKey) {
      return NextResponse.json(
        { message: 'API密钥不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedKey);

  } catch (error) {
    console.error('Update API key error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/[id] - 删除API密钥
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to get the id
    const { id } = await params;
    
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

    const deleted = await deleteApiKey(user.id, id);
    if (!deleted) {
      return NextResponse.json(
        { message: 'API密钥不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'API密钥已删除' });

  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}