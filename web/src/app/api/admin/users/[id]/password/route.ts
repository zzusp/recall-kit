import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getCurrentUser } from '@/lib/server/services/auth';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { newPassword } = await request.json();

    // 获取当前用户信息
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = await getCurrentUser(sessionToken);
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      );
    }

    // 检查超级管理员权限
    if (!currentUser.is_superuser) {
      return NextResponse.json(
        { error: '权限不足，只有超级管理员可以修改用户密码' },
        { status: 403 }
      );
    }

    // 验证必填字段
    if (!newPassword) {
      return NextResponse.json(
        { error: '新密码为必填项' },
        { status: 400 }
      );
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '新密码长度至少为6位' },
        { status: 400 }
      );
    }

    // 检查目标用户是否存在
    const userResult = await db.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 防止超级管理员修改自己的密码（应该通过专门的密码修改功能）
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: '不能通过此接口修改自己的密码，请使用个人设置中的密码修改功能' },
        { status: 400 }
      );
    }

    const targetUser = userResult.rows[0];

    // 生成新密码哈希
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    const updateQuery = `
      UPDATE users 
      SET 
        password_hash = $1,
        updated_at = NOW(),
        last_password_change = NOW()
      WHERE id = $2
    `;

    await db.query(updateQuery, [newPasswordHash, id]);

    return NextResponse.json({
      message: `用户 ${targetUser.username} 的密码已成功重置`,
      success: true
    });

  } catch (error) {
    console.error('Error resetting user password:', error);
    return NextResponse.json(
      { error: '重置密码失败' },
      { status: 500 }
    );
  }
}