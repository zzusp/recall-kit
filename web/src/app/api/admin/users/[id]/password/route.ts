import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
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
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;
    const { id: targetUserId } = await params;
    // 现在还没有个人设置中的密码修改功能，所以暂时不限制
    // if (currentUser.id === targetUserId) {
    //   return ApiRouteError.forbidden('请使用个人设置中的密码修改功能');
    // }

    const hasResetPermission =
      currentUser.is_superuser || hasPermission(session, 'users.reset_password');

    if (!hasResetPermission) {
      return ApiRouteError.forbidden('权限不足，只有超级管理员或有 users.reset_password 权限的用户可以重置密码');
    }

    const { newPassword } = await request.json();

    // 验证必填字段
    if (!newPassword) {
      return ApiRouteError.badRequest('新密码不能为空');
    }

    const { authConfig } = await import('@/config/auth');

    if (newPassword.length < authConfig.password.minLength) {
      return ApiRouteError.badRequest(`新密码长度不能少于${authConfig.password.minLength}位`);
    }

    // 获取用户信息
    const userQuery = 'SELECT id, username FROM users WHERE id = $1 AND is_active = true';
    const userResult = await db.query(userQuery, [targetUserId]);

    if (userResult.rows.length === 0) {
      return ApiRouteError.notFound('用户不存在或已被禁用');
    }

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      authConfig.password?.saltRounds ?? 12
    );

    // 更新密码
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, last_password_change = NOW(), updated_at = NOW()
      WHERE id = $2
    `;
    
    await db.query(updateQuery, [newPasswordHash, targetUserId]);

    return ApiRouteResponse.success(
      {
        message: '密码重置成功',
        username: userResult.rows[0].username
      },
      '密码重置成功'
    );

  } catch (error) {
    console.error('Error resetting password:', error);
    return ApiRouteError.internal('重置密码失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
