import { User, Role, Permission } from '@/types/database/auth';
import { db } from '../db/client';

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

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// Server-side authentication functions

// Session management
export async function login(credentials: LoginCredentials): Promise<{ user: AuthUser; sessionToken: string }> {
  // Get user by username
  const userResult = await db.query(
    'SELECT * FROM users WHERE username = $1 AND is_active = true',
    [credentials.username]
  );

  if (userResult.rows.length === 0) {
    throw new Error('用户名或密码错误');
  }

  const user = userResult.rows[0];

  // TODO: Implement proper password verification
  // For now, just compare the hash (you should use bcrypt)
  if (user.password_hash !== credentials.password) {
    throw new Error('用户名或密码错误');
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

  return { user: authUser, sessionToken };
}

export async function logout(sessionToken: string): Promise<void> {
  await db.query(
    'DELETE FROM user_sessions WHERE session_token = $1',
    [sessionToken]
  );
}

export async function getCurrentUser(sessionToken: string | undefined): Promise<AuthUser | null> {
  // Check if sessionToken is provided
  if (!sessionToken) {
    return null;
  }

  // Validate session
  const sessionResult = await db.query(
    'SELECT user_id, expires_at FROM user_sessions WHERE session_token = $1',
    [sessionToken]
  );

  if (sessionResult.rows.length === 0) {
    return null;
  }

  const session = sessionResult.rows[0];

  // Check if session is expired
  if (new Date(session.expires_at) < new Date()) {
    await db.query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );
    return null;
  }

  // Get user details
  const userResult = await db.query(
    'SELECT * FROM users WHERE id = $1 AND is_active = true',
    [session.user_id]
  );

  if (userResult.rows.length === 0) {
    return null;
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

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles,
    permissions,
    is_superuser: user.is_superuser
  };
}

/**
 * 验证 session token 是否有效
 * 服务端专用函数，不依赖客户端环境
 */
export async function validateSessionToken(sessionToken: string | undefined): Promise<boolean> {
  if (!sessionToken) {
    return false;
  }

  try {
    const result = await db.query(
      'SELECT user_id FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    return result.rows.length > 0;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error validating session token:', error);
    }
    return false;
  }
}

/**
 * Update last login time
 */
export async function updateLastLoginTime(userId: string) {
  try {
    await db.query(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [new Date().toISOString(), userId]
    );
  } catch (error) {
    console.error('Error updating last login time:', error);
  }
}

// Permission checking
export function hasPermission(user: AuthUser, resource: string, action: string): boolean {
  if (user.is_superuser) {
    return true;
  }

  return user.permissions.some(
    permission => permission.resource === resource && permission.action === action
  );
}

export function hasAnyPermission(user: AuthUser, permissions: Array<{ resource: string; action: string }>): boolean {
  if (user.is_superuser) {
    return true;
  }

  return permissions.some(({ resource, action }) => 
    hasPermission(user, resource, action)
  );
}

export function hasRole(user: AuthUser, roleName: string): boolean {
  return user.roles.some(role => role.name === roleName);
}

// Helper functions
function generateSessionToken(): string {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
}