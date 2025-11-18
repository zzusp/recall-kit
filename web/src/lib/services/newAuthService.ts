import { User, Role, Permission } from '@/types/database';
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
  if (roles.length > 0) {
    const roleIds = roles.map(r => r.id);
    const rolePermissionsResult = await db.query(`
      SELECT p.id, p.name, p.resource, p.action, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ANY($1)
    `, [roleIds]);

    const permissions = rolePermissionsResult.rows;

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

  throw new Error('用户没有分配任何角色');
}

export async function logout(sessionToken: string): Promise<void> {
  await db.query(
    'DELETE FROM user_sessions WHERE session_token = $1',
    [sessionToken]
  );
}

export async function getCurrentUser(sessionToken: string): Promise<AuthUser | null> {
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

// Client-side session management
export function setSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('session_token', token);
  }
}

export function getSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('session_token');
  }
  return null;
}

export function removeSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('session_token');
  }
}