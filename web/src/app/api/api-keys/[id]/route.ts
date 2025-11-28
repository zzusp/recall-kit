import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyById, updateApiKey, deleteApiKey, validateApiKey } from '@/lib/server/services/apiKey';
import { getServerSession } from '@/lib/server/auth';

export const runtime = 'nodejs';

// GET /api/api-keys/[id] - 获取特定API密钥信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { message: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;
    const apiKey = await getApiKeyById(currentUser.id, id);
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
    
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { message: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

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

    const updatedKey = await updateApiKey(currentUser.id, id, updates);
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
    
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { message: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;
    const deleted = await deleteApiKey(currentUser.id, id);
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