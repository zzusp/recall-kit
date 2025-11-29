/**
 * NextAuth.js 服务端辅助函数
 * 用于在 API 路由和 Server Components 中获取会话
 */

import { auth } from '@/app/api/auth/[...nextauth]/route';

/**
 * 获取当前用户会话
 * 在 API 路由和 Server Components 中使用
 */
export async function getServerSession() {
  return await auth();
}

/**
 * 要求用户已登录
 * 如果未登录，返回 null
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    return null;
  }
  return session;
}

/**
 * 检查用户是否具有指定角色
 */
export function hasRole(session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>, roleName: string): boolean {
  const user = session.user as any;
  if (!user?.roles) return false;
  return user.roles.some((role: any) => role.name === roleName);
}

/**
 * 检查用户是否为管理员或超级用户
 */
export function isAdminOrSuperuser(session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>): boolean {
  const user = session.user as any;
  return user?.is_superuser || hasRole(session, 'admin');
}

/**
 * 检查用户是否具有指定权限（使用 code 字段，function 类型）
 */
export function hasPermission(
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>,
  code: string
): boolean {
  const user = session.user as any;
  if (user?.is_superuser) return true;
  if (!user?.permissions) return false;
  return user.permissions.some(
    (permission: any) => permission.type === 'function' && permission.code === code && permission.is_active
  );
}

/**
 * 兼容旧的 resource + action 调用方式
 */
export function hasPermissionByResourceAction(
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>,
  resource: string,
  action: string
): boolean {
  const code = `${resource}.${action}`;
  return hasPermission(session, code);
}

/**
 * 检查用户是否有页面权限（page 类型）
 */
export function hasPagePermission(
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>,
  pagePath: string
): boolean {
  const user = session.user as any;
  if (user?.is_superuser) return true;
  if (!user?.permissions) return false;
  return user.permissions.some(
    (permission: any) => permission.type === 'page' && permission.page_path === pagePath && permission.is_active
  );
}

