import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;

    const { currentPassword, newPassword } = await request.json();

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return ApiRouteResponse.badRequest('当前密码和新密码为必填项');
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return ApiRouteResponse.badRequest('新密码长度至少为6位');
    }

    // 获取用户当前密码信息
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [currentUser.id]);

    if (userResult.rows.length === 0) {
      return ApiRouteResponse.notFound('用户不存在');
    }

    const user = userResult.rows[0];

    // 验证当前密码
    if (user.password_hash) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return ApiRouteResponse.badRequest('当前密码不正确');
      }
    } else {
      // 如果用户没有密码哈希（可能是社交登录用户），需要特殊处理
      return ApiRouteResponse.badRequest('您的账户是通过第三方登录创建的，暂不支持修改密码');
    }

    // 生成新密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    const updateQuery = `
      UPDATE users 
      SET 
        password_hash = $1,
        updated_at = NOW(),
        last_password_change = NOW()
      WHERE id = $2
    `;

    await db.query(updateQuery, [newPasswordHash, currentUser.id]);

    // 记录密码修改日志（可选）
    const logQuery = `
      INSERT INTO user_activity_logs 
      (user_id, action, details, created_at)
      VALUES ($1, 'password_changed', '用户修改了登录密码', NOW())
    `;

    await db.query(logQuery, [currentUser.id]);

    return ApiRouteResponse.success(null, '密码修改成功');

  } catch (error) {
    console.error('Error changing password:', error);
    return ApiRouteResponse.internalError('修改密码失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}