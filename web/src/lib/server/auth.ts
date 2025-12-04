/**
 * 统一权限检查工具函数
 * 基于NextAuth.js的会话管理
 */

import { auth } from '@/lib/auth';
import { Permission } from '@/types/database/auth';

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
 * 检查用户是否具有指定权限（使用 code 字段，function 类型）
 * 这是主要的权限检查函数
 */
export function hasPermission(
  session: any,
  code: string
): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  if (user.is_superuser) return true;
  
  if (!user.permissions) return false;
  
  return user.permissions.some(
    (permission: Permission) => 
      permission.type === 'function' && 
      permission.code === code && 
      permission.is_active
  );
}

/**
 * 检查用户是否具有页面权限（page 类型）
 * 用于路由级别的权限检查
 */
export function hasPagePermission(
  session: any,
  pagePath: string
): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  if (user.is_superuser) return true;
  
  if (!user.permissions) return false;
  
  return user.permissions.some(
    (permission: Permission) => 
      permission.type === 'page' && 
      permission.page_path === pagePath && 
      permission.is_active
  );
}

/**
 * 检查用户是否具有模块权限（module 类型）
 * 模块权限通常意味着可以访问该模块下的所有页面和功能
 */
export function hasModulePermission(
  session: any,
  moduleCode: string
): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  if (user.is_superuser) return true;
  
  if (!user.permissions) return false;
  
  return user.permissions.some(
    (permission: Permission) => 
      permission.type === 'module' && 
      permission.code === moduleCode && 
      permission.is_active
  );
}

/**
 * 检查用户是否具有任一指定权限
 */
export function hasAnyPermission(
  session: any,
  codes: string[]
): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  if (user.is_superuser) return true;
  
  return codes.some(code => hasPermission(session, code));
}

/**
 * 检查用户是否具有所有指定权限
 */
export function hasAllPermissions(
  session: any,
  codes: string[]
): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  if (user.is_superuser) return true;
  
  return codes.every(code => hasPermission(session, code));
}

/**
 * 兼容旧的 resource + action 调用方式
 * 将 resource.action 转换为权限代码
 */
export function hasPermissionByResourceAction(
  session: any,
  resource: string,
  action: string
): boolean {
  const code = `${resource}.${action}`;
  return hasPermission(session, code);
}

/**
 * 检查用户是否具有指定角色
 */
export function hasRole(session: any, roleName: string): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  if (!user.roles) return false;
  
  return user.roles.some((role: any) => role.name === roleName);
}

/**
 * 检查用户是否为管理员或超级用户
 */
export function isAdminOrSuperuser(session: any): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  return user.is_superuser || hasRole(session, 'admin');
}

/**
 * 检查用户是否为超级用户
 */
export function isSuperuser(session: any): boolean {
  if (!session?.user) return false;
  
  const user = session.user as any;
  return user.is_superuser === true;
}

/**
 * 获取用户所有权限代码
 */
export function getUserPermissionCodes(session: any): string[] {
  if (!session?.user) return [];
  
  const user = session.user as any;
  if (user.is_superuser) return ['*']; // 超级用户拥有所有权限
  
  if (!user.permissions) return [];
  
  return user.permissions
    .filter((permission: Permission) => 
      permission.is_active && 
      permission.type === 'function' && 
      permission.code
    )
    .map((permission: Permission) => permission.code!);
}

/**
 * 获取用户所有页面权限路径
 */
export function getUserPagePaths(session: any): string[] {
  if (!session?.user) return [];
  
  const user = session.user as any;
  if (user.is_superuser) return ['*']; // 超级用户可访问所有页面
  
  if (!user.permissions) return [];
  
  return user.permissions
    .filter((permission: Permission) => 
      permission.is_active && 
      permission.type === 'page' && 
      permission.page_path
    )
    .map((permission: Permission) => permission.page_path!);
}

/**
 * 权限继承检查
 * 检查用户是否有权限访问某个资源，包括继承权限
 * 例如：拥有模块权限则自动拥有该模块下的所有页面和功能权限
 */
export function hasPermissionWithInheritance(
  session: any,
  targetCode: string,
  targetType: 'function' | 'page' | 'module' = 'function'
): boolean {
  // 直接权限检查
  if (targetType === 'function') {
    if (hasPermission(session, targetCode)) return true;
  } else if (targetType === 'page') {
    if (hasPagePermission(session, targetCode)) return true;
  } else if (targetType === 'module') {
    if (hasModulePermission(session, targetCode)) return true;
  }
  
  // 继承权限检查逻辑
  // 这里需要根据具体的权限数据结构来实现
  // 暂时返回false，后续可以根据需要实现
  return false;
}

/**
 * 权限验证装饰器辅助函数
 * 用于在API路由中快速验证权限
 */
export function createAuthMiddleware(permissions?: string[]) {
  return async (request: Request) => {
    const session = await getServerSession();
    
    if (!session) {
      return Response.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }
    
    if (permissions && permissions.length > 0) {
      const hasRequiredPermissions = permissions.some(code => 
        hasPermission(session, code)
      );
      
      if (!hasRequiredPermissions) {
        return Response.json(
          { error: '权限不足' },
          { status: 403 }
        );
      }
    }
    
    return { session };
  };
}
