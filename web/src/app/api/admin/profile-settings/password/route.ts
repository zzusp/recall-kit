import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;

    const { currentPassword, newPassword } = await request.json();

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return ApiRouteError.badRequest('当前密码和新密码不能为空');
    }

    const { authConfig } = await import('@/config/auth');

    if (newPassword.length < authConfig.password.minLength) {
      return ApiRouteError.badRequest(`新密码长度不能少于${authConfig.password.minLength}位`);
    }

    // 获取用户当前密码
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [currentUser.id]);

    if (userResult.rows.length === 0) {
      return ApiRouteError.notFound('用户不存在');
    }

    const user = userResult.rows[0];

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return ApiRouteError.badRequest('当前密码不正确');
    }

    // 加密新密码
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
    
    await db.query(updateQuery, [newPasswordHash, currentUser.id]);

    return ApiRouteResponse.success(null, '密码修改成功');

  } catch (error) {
    console.error('Error changing password:', error);
    return ApiRouteError.internal('修改密码失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
