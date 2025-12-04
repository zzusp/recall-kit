import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteError.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    const body = await request.json();
    const {
      username,
      email,
      phone,
      bio
    } = body;

    // 验证必填字段
    if (!username || !email) {
      return ApiRouteError.badRequest('用户名和邮箱不能为空');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ApiRouteError.badRequest('邮箱格式不正确');
    }

    // 检查用户名是否已被其他用户使用
    const usernameCheckQuery = 'SELECT id FROM users WHERE username = $1 AND id != $2';
    const usernameCheckResult = await db.query(usernameCheckQuery, [username, currentUser.id]);

    if (usernameCheckResult.rows.length > 0) {
      return ApiRouteError.badRequest('用户名已被使用');
    }

    // 检查邮箱是否已被其他用户使用
    const emailCheckQuery = 'SELECT id FROM users WHERE email = $1 AND id != $2';
    const emailCheckResult = await db.query(emailCheckQuery, [email, currentUser.id]);

    if (emailCheckResult.rows.length > 0) {
      return ApiRouteError.badRequest('邮箱已被使用');
    }

    // 更新用户信息
    const updateQuery = `
      UPDATE users 
      SET username = $1, email = $2, phone = $3, bio = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, username, email, phone, bio, is_active, is_superuser, created_at, updated_at
    `;

    const result = await db.query(updateQuery, [
      username,
      email,
      phone || null,
      bio || null,
      currentUser.id
    ]);

    const updatedUser = result.rows[0];

    return ApiRouteResponse.success(updatedUser, '个人信息更新成功');

  } catch (error) {
    console.error('Error updating profile:', error);
    return ApiRouteError.internal('更新个人信息失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteError.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    // 获取用户详细信息
    const query = `
      SELECT 
        id, username, email, phone, bio, is_active, is_superuser,
        last_login_at, last_password_change, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;

    const result = await db.query(query, [currentUser.id]);

    if (result.rows.length === 0) {
      return ApiRouteError.notFound('用户不存在');
    }

    const user = result.rows[0];

    return ApiRouteResponse.success(user);

  } catch (error) {
    console.error('Error fetching profile:', error);
    return ApiRouteError.internal('获取个人信息失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
