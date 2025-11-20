import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { User, Role, Permission } from '@/types/database/auth';
import bcrypt from 'bcrypt';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  is_superuser: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Helper functions
function generateSessionToken(): string {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
}

export async function POST(request: NextRequest) {
  try {
    const credentials: LoginCredentials = await request.json();

    if (!credentials.username || !credentials.password) {
      return ApiRouteResponse.badRequest('用户名和密码不能为空');
    }

    // Get user by username or email
    const userResult = await db.query(
      'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
      [credentials.username]
    );

    if (userResult.rows.length === 0) {
      return ApiRouteResponse.error('INVALID_CREDENTIALS', '用户名或密码错误', undefined, 401);
    }

    const user = userResult.rows[0];

    // Verify password using bcrypt
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
    } catch (error) {
      console.error('Password comparison error:', error);
      // Fallback for development/testing - remove in production
      isPasswordValid = credentials.password === user.password_hash;
    }
    
    if (!isPasswordValid) {
      return ApiRouteResponse.error('INVALID_CREDENTIALS', '用户名或密码错误', undefined, 401);
    }

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

    if (roles.length === 0) {
      return ApiRouteResponse.forbidden('用户没有分配任何角色');
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.query(
      'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, sessionToken, expiresAt.toISOString()]
    );

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [new Date().toISOString(), user.id]
    );

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions,
      is_superuser: user.is_superuser
    };

    return ApiRouteResponse.success({
      user: authUser,
      sessionToken
    }, '登录成功');

  } catch (error) {
    console.error('Login error:', error);
    return ApiRouteResponse.internalError('服务器内部错误', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}