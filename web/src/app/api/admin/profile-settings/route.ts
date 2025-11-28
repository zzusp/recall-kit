import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    const body = await request.json();
    const {
      username,
      email,
      fullName,
      bio,
      timezone,
      language,
      emailNotifications,
      pushNotifications,
    } = body;

    // 验证必填字段
    if (!username || !email) {
      return ApiRouteResponse.badRequest('用户名和邮箱为必填项');
    }

    // 检查用户名是否已被其他用户使用
    const usernameCheck = await db.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, currentUser.id]
    );

    if (usernameCheck.rows.length > 0) {
      return ApiRouteResponse.badRequest('用户名已被使用');
    }

    // 检查邮箱是否已被其他用户使用
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, currentUser.id]
    );

    if (emailCheck.rows.length > 0) {
      return ApiRouteResponse.badRequest('邮箱已被使用');
    }

    // 更新用户信息 - 只使用现有字段
    const updateQuery = `
      UPDATE users 
      SET 
        username = $1,
        email = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, username, email, updated_at
    `;

    const result = await db.query(updateQuery, [
      username,
      email,
      currentUser.id
    ]);

    const updatedUser = result.rows[0];

    return ApiRouteResponse.success(updatedUser, '个人设置已成功保存');

  } catch (error) {
    console.error('Error updating profile settings:', error);
    return ApiRouteResponse.internalError('保存个人设置失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    // 获取用户详细信息 - 查询正确的字段名
    const userQuery = `
      SELECT 
        id, username, email, created_at, updated_at,
        last_login_at, is_superuser
      FROM users 
      WHERE id = $1
    `;

    const result = await db.query(userQuery, [currentUser.id]);

    if (result.rows.length === 0) {
      return ApiRouteResponse.notFound('用户不存在');
    }

    const user = result.rows[0];

    return ApiRouteResponse.success(user);

  } catch (error) {
    console.error('Error fetching profile settings:', error);
    return ApiRouteResponse.internalError('获取个人设置失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}