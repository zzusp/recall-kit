import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteError } from '@/lib/utils/apiResponse';

// 权限配置常量
export const PERMISSIONS = {
  // 用户管理权限
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.reset_password',
  
  // 角色管理权限
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',
  ROLES_ASSIGN: 'roles.assign',
  
  // 权限管理权限
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_CREATE: 'permissions.create',
  PERMISSIONS_EDIT: 'permissions.edit',
  PERMISSIONS_DELETE: 'permissions.delete',
  
  // 经验管理权限
  EXPERIENCES_VIEW: 'experiences.view',
  EXPERIENCES_CREATE: 'experiences.create',
  EXPERIENCES_EDIT: 'experiences.edit',
  EXPERIENCES_DELETE: 'experiences.delete',
  EXPERIENCES_PUBLISH: 'experiences.publish',
  
  // 系统设置权限
  ADMIN_SETTINGS_VIEW: 'admin.settings.view',
  ADMIN_SETTINGS_EDIT: 'admin.settings.edit',
  
  // 管理仪表板权限
  ADMIN_DASHBOARD: 'admin.dashboard',
} as const;

export interface AuthOptions {
  requireAuth?: boolean;
  requireSuperuser?: boolean;
  permission?: string;
  allowSelf?: boolean;
  resourceOwnerId?: string;
}

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: any;
}

/**
 * 验证API权限
 * 使用NextAuth.js的会话管理
 */
export async function validateApiPermission(
  request: NextRequest,
  config: AuthOptions
): Promise<AuthResult> {
  try {
    const {
      requireAuth = false,
      requireSuperuser = false,
      permission,
      allowSelf = false,
      resourceOwnerId
    } = config;

    // 如果不需要认证，直接通过
    if (!requireAuth) {
      return { success: true };
    }

    // 获取用户会话
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: ApiRouteError.unauthorized('未授权访问')
      };
    }

    const user = session.user as any;

    // 检查超级用户权限
    if (requireSuperuser && !user.is_superuser) {
      return {
        success: false,
        error: ApiRouteError.forbidden('需要超级用户权限')
      };
    }

    // 检查特定权限
    if (permission) {
      // 使用统一的权限检查函数
      const hasPermission = user.permissions?.some((p: any) => 
        p.code === permission && 
        p.is_active
      ) || user.is_superuser;

      // 如果允许自己访问，检查是否是资源所有者
      if (!hasPermission && allowSelf && resourceOwnerId && user.id === resourceOwnerId) {
        return { success: true, user };
      }

      if (!hasPermission) {
        return {
          success: false,
          error: ApiRouteError.forbidden(`需要权限: ${permission}`)
        };
      }
    }

    return { success: true, user };

  } catch (error) {
    console.error('Error in validateApiPermission:', error);
    return {
      success: false,
      error: ApiRouteError.internal('权限验证失败')
    };
  }
}

/**
 * 常用权限验证函数
 * 返回高阶函数，用于包装API路由处理器
 */
export const requireAuth = (allowSelf?: boolean) => 
  (request: NextRequest) => validateApiPermission(request, { requireAuth: true, allowSelf });

export const requireSuperuser = () => 
  (request: NextRequest) => validateApiPermission(request, { requireAuth: true, requireSuperuser: true });

export const requirePermission = (permission: string, allowSelf?: boolean) => 
  (request: NextRequest) => validateApiPermission(request, { requireAuth: true, permission, allowSelf });

export const requireSelfAccess = (resourceOwnerId: string) =>
  (request: NextRequest) => validateApiPermission(request, { requireAuth: true, allowSelf: true, resourceOwnerId });

/**
 * 权限检查中间件
 * 可以包装API路由处理函数
 */
export function withAuth(options: AuthOptions) {
  return async (request: NextRequest, ...args: any[]) => {
    const authResult = await validateApiPermission(request, options);
    
    if (!authResult.success) {
      throw authResult.error;
    }

    // 将用户信息添加到请求中
    (request as any).user = authResult.user;
    
    return args;
  };
}

/**
 * 权限装饰器
 * 用于类方法的权限验证
 */
export function RequireAuth(options: AuthOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const request = args[0] as NextRequest;
      const authResult = await validateApiPermission(request, options);
      
      if (!authResult.success) {
        throw authResult.error;
      }

      // 将用户信息添加到请求中
      (request as any).user = authResult.user;
      
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * 检查用户是否有权限
 */
export function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  
  return user.permissions?.some((p: any) => 
    p.code === permission && p.is_active
  ) || false;
}

/**
 * 检查用户是否有任意权限
 */
export function hasAnyPermission(user: any, permissions: string[]): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * 检查用户是否有所有权限
 */
export function hasAllPermissions(user: any, permissions: string[]): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * 检查用户是否有角色
 */
export function hasRole(user: any, roleName: string): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  
  return user.roles?.some((role: any) => role.name === roleName) || false;
}

/**
 * 检查用户是否为管理员或超级用户
 */
export function isAdminOrSuperuser(user: any): boolean {
  if (!user) return false;
  return user.is_superuser || hasRole(user, 'admin');
}
