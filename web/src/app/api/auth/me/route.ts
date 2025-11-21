import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { User, Role, Permission } from '@/types/database/auth';

export const runtime = 'nodejs';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  is_superuser: boolean;
  created_at?: string;
  last_login_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '') ||
                        request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: '未提供会话令牌' },
        { status: 401 }
      );
    }

    // Validate session
    const sessionResult = await db.query(
      'SELECT user_id, expires_at FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { message: '无效的会话令牌' },
        { status: 401 }
      );
    }

    const session = sessionResult.rows[0];

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await db.query(
        'DELETE FROM user_sessions WHERE session_token = $1',
        [sessionToken]
      );
      return NextResponse.json(
        { message: '会话已过期' },
        { status: 401 }
      );
    }

    // Get user details
    const userResult = await db.query(
      'SELECT id, username, email, is_superuser, last_login_at, created_at FROM users WHERE id = $1 AND is_active = true',
      [session.user_id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: '用户不存在或已被禁用' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Get user roles and permissions
    const userRolesResult = await db.query(`
      SELECT r.id, r.name, r.description, r.is_system_role
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [user.id]);

    const roles = userRolesResult.rows;

    // Get permissions from roles
    let permissions: Permission[] = [];
    if (roles.length > 0) {
      const roleIds = roles.map(r => r.id);
      const rolePermissionsResult = await db.query(`
        SELECT p.id, p.name, p.resource, p.action, p.description
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1)
      `, [roleIds]);

      permissions = rolePermissionsResult.rows;
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions,
      is_superuser: user.is_superuser,
      created_at: user.created_at,
      last_login_at: user.last_login_at
    };

    return NextResponse.json(authUser);

  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}