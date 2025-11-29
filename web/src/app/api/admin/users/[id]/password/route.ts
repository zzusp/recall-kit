import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, isAdminOrSuperuser } from '@/lib/server/auth';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // 检查超级管理员权限
    if (!currentUser.is_superuser && !isAdminOrSuperuser(session)) {
      return NextResponse.json(
        { error: '权限不足，只有超级管理员可以修改用户密码' },
        { status: 403 }
      );
    }

    // 现在读取请求体
    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

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

    // 允许超级管理员修改任何用户的密码，包括自己的
    // 如果用户想修改自己的密码，可以使用个人设置中的密码修改功能（需要输入当前密码）
    // 但这里也允许直接重置，因为超级管理员有权限

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