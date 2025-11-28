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
 * 检查用户是否具有指定权限
 */
export function hasPermission(
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>,
  resource: string,
  action: string
): boolean {
  const user = session.user as any;
  if (user?.is_superuser) return true;
  if (!user?.permissions) return false;
  return user.permissions.some(
    (permission: any) => permission.resource === resource && permission.action === action
  );
}

