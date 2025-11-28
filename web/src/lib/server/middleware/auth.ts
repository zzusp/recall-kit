import { NextRequest } from 'next/server';
import { getCurrentUser } from '../services/auth';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';

export interface AuthResult {
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  sessionToken: string;
}

export interface AuthError {
  error: string;
  status: number;
}

/**
 * 统一的鉴权中间件函数
 * 从请求中提取 session token 并验证用户身份
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  // 优先从 Authorization 头获取，其次从 cookie 获取
  const sessionToken =
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.cookies.get('session_token')?.value;

  if (!sessionToken) {
    return {
      error: '未提供会话令牌',
      status: 401,
    };
  }

  const user = await getCurrentUser(sessionToken);
  if (!user) {
    return {
      error: '无效的会话令牌或会话已过期',
      status: 401,
    };
  }

  return {
    user,
    sessionToken,
  };
}

/**
 * 检查用户是否具有指定角色
 */
export function hasRole(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  roleName: string
): boolean {
  return user.roles.some((role) => role.name === roleName);
}

/**
 * 检查用户是否为管理员或超级用户
 */
export function isAdminOrSuperuser(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
): boolean {
  return user.is_superuser || hasRole(user, 'admin');
}

/**
 * 验证 session token 是否有效（用于中间件）
 */
export async function validateSession(
  sessionToken: string | undefined
): Promise<boolean> {
  if (!sessionToken) {
    return false;
  }

  const user = await getCurrentUser(sessionToken);
  return user !== null;
}

