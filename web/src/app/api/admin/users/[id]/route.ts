import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;
    const { id } = await params;
    const isOwnProfile = currentUser.id === id;
    
    if (!isOwnProfile && !currentUser.is_superuser && !hasPermission(session, 'users.view')) {
      return ApiRouteError.forbidden('您没有权限查看用户详情');
    }

    // 获取用户详细信息（包括角色和权限）
    const userQuery = `
      SELECT 
        u.id, u.username, u.email, u.is_active, u.is_superuser,
        u.created_at, u.updated_at, u.last_login_at, u.last_password_change,
        array_agg(
          json_build_object(
            'id', r.id,
            'name', r.name,
            'description', r.description,
            'is_system_role', r.is_system_role,
            'created_at', r.created_at
          )
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.email, u.is_active, u.is_superuser, 
               u.created_at, u.updated_at, u.last_login_at, u.last_password_change
    `;
    
    const result = await db.query(userQuery, [id]);
    
    if (result.rows.length === 0) {
      return ApiRouteError.notFound('用户不存在');
    }

    const user = result.rows[0];
    
    return ApiRouteResponse.success(user, '获取用户详情成功');

  } catch (error) {
    console.error('Error fetching user:', error);
    return ApiRouteError.internal('获取用户详情失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;
    const { id } = await params;
    const isOwnProfile = currentUser.id === id;
    
    if (!isOwnProfile && !currentUser.is_superuser && !hasPermission(session, 'users.edit')) {
      return ApiRouteError.forbidden('您没有权限编辑用户');
    }

    const { username, email, is_superuser, is_active, roleIds } = await request.json();

    // 构建更新字段
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (is_superuser !== undefined) {
      updates.push(`is_superuser = $${paramIndex++}`);
      values.push(is_superuser);
    }

    if (is_active !== undefined) {
      // 防止用户禁用自己的账户（除非是超级用户）
      if (!is_active && !currentUser.is_superuser && isOwnProfile) {
        return ApiRouteError.badRequest('不能禁用自己的账户');
      }
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0 && roleIds === undefined) {
      return ApiRouteError.badRequest('没有要更新的字段');
    }

    // 检查用户是否存在
    const existingUserQuery = 'SELECT id, username FROM users WHERE id = $1';
    const existingUserResult = await db.query(existingUserQuery, [id]);
    
    if (existingUserResult.rows.length === 0) {
      return ApiRouteError.notFound('用户不存在');
    }

    // 如果有用户字段需要更新
    if (updates.length > 0) {
      // 添加更新时间
      updates.push(`updated_at = NOW()`);
      values.push(id); // WHERE 条件的参数

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `;
      
      await db.query(updateQuery, values);
    }

    // 如果有角色更新
    if (roleIds !== undefined && Array.isArray(roleIds)) {
      // 首先删除用户现有的角色关联
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      
      // 然后添加新的角色关联
      if (roleIds.length > 0) {
        const assignRolesQuery = 'INSERT INTO user_roles (user_id, role_id, created_at) VALUES ($1, $2, NOW())';
        for (const roleId of roleIds) {
          await db.query(assignRolesQuery, [id, roleId]);
        }
      }
    }

    // 返回更新后的用户信息（包括角色）
    const updatedUserQuery = `
      SELECT 
        u.id, u.username, u.email, u.is_active, u.is_superuser, u.updated_at,
        array_agg(
          json_build_object(
            'id', r.id,
            'name', r.name,
            'description', r.description,
            'is_system_role', r.is_system_role,
            'created_at', r.created_at
          )
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.email, u.is_active, u.is_superuser, u.updated_at
    `;
    
    const updatedResult = await db.query(updatedUserQuery, [id]);
    
    return ApiRouteResponse.success(updatedResult.rows[0], '更新用户信息成功');

  } catch (error) {
    console.error('Error updating user:', error);
    return ApiRouteError.internal('更新用户信息失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;
    const { id } = await params;
    const isOwnProfile = currentUser.id === id;
    
    if (isOwnProfile) {
      return ApiRouteError.badRequest('不能删除自己的账户');
    }

    if (!currentUser.is_superuser && !hasPermission(session, 'users.delete')) {
      return ApiRouteError.forbidden('您没有权限删除用户');
    }

    // 检查用户是否存在
    const existingUserQuery = 'SELECT id, username FROM users WHERE id = $1';
    const existingUserResult = await db.query(existingUserQuery, [id]);
    
    if (existingUserResult.rows.length === 0) {
      return ApiRouteError.notFound('用户不存在');
    }

    // 由于数据库表没有 is_deleted 字段，这里我们改为硬删除
    // 首先删除用户角色关联
    await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    
    // 然后删除用户
    const deleteQuery = 'DELETE FROM users WHERE id = $1';
    await db.query(deleteQuery, [id]);

    return ApiRouteResponse.success(
      { 
        message: '用户删除成功',
        username: existingUserResult.rows[0].username
      },
      '用户删除成功'
    );

  } catch (error) {
    console.error('Error deleting user:', error);
    return ApiRouteError.internal('删除用户失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
