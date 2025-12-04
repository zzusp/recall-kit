/**
 * 权限守卫组件
 * 基于新的权限检查系统
 */

'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { permissionToast } from '@/lib/client/services/permissionToast';
import { getErrorMessage } from '@/config/errorMessages';

export interface PermissionGuardProps {
  children: React.ReactNode;
  // 权限代码（function类型）
  code?: string;
  // 页面路径（page类型）
  pagePath?: string;
  // 模块代码（module类型）
  moduleCode?: string;
  // 资源和操作（兼容旧方式）
  resource?: string;
  action?: string;
  // 多个权限，满足任一即可
  anyPermissions?: string[];
  // 多个权限，必须全部满足
  allPermissions?: string[];
  // 是否需要认证
  requireAuth?: boolean;
  // 无权限时的显示内容
  fallback?: React.ReactNode;
  // 是否显示权限不足的提示
  showToast?: boolean;
  // 自定义权限不足的提示信息
  unauthorizedMessage?: string;
  // 自定义未登录的提示信息
  loginRequiredMessage?: string;
  // 禁用默认消息，完全使用自定义消息
  useCustomMessages?: boolean;
}

/**
 * 权限守卫组件
 * 根据用户权限控制组件的显示
 */
export default function PermissionGuard({
  children,
  code,
  pagePath,
  moduleCode,
  resource,
  action,
  anyPermissions,
  allPermissions,
  requireAuth = true,
  fallback = null,
  showToast = true,
  unauthorizedMessage,
  loginRequiredMessage,
  useCustomMessages = false,
}: PermissionGuardProps) {
  // 使用统一的消息配置，除非明确指定使用自定义消息
  const defaultUnauthorizedMessage = useCustomMessages 
    ? unauthorizedMessage || '您没有权限访问此功能'
    : unauthorizedMessage || getErrorMessage.forbidden().message;
    
  const defaultLoginRequiredMessage = useCustomMessages
    ? loginRequiredMessage || '请先登录'
    : loginRequiredMessage || getErrorMessage.unauthorized('needLogin').message;
  
  const router = useRouter();
  const {
    hasPermission,
    hasPagePermission,
    hasModulePermission,
    hasAnyPermission,
    hasAllPermissions,
    hasPermissionByResourceAction,
    isAuthenticated,
    isLoading,
  } = usePermissions();
  
  const hasShownToast = useRef(false);

  // 检查权限
  let hasAccess = true;
  
  if (code) {
    hasAccess = hasPermission(code);
  } else if (pagePath) {
    hasAccess = hasPagePermission(pagePath);
  } else if (moduleCode) {
    hasAccess = hasModulePermission(moduleCode);
  } else if (resource && action) {
    hasAccess = hasPermissionByResourceAction(resource, action);
  } else if (anyPermissions && anyPermissions.length > 0) {
    hasAccess = hasAnyPermission(anyPermissions);
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(allPermissions);
  }

  // 显示权限不足的提示
  useEffect(() => {
    if (!hasAccess && isAuthenticated && showToast && !hasShownToast.current && !isLoading) {
      permissionToast.forbidden({
        customMessage: defaultUnauthorizedMessage,
        duration: 5000,
      });
      hasShownToast.current = true;
    }
  }, [hasAccess, isAuthenticated, showToast, defaultUnauthorizedMessage, isLoading]);

  // 重置toast标记
  useEffect(() => {
    if (hasAccess) {
      hasShownToast.current = false;
    }
  }, [hasAccess]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">验证权限中...</p>
        </div>
      </div>
    );
  }

  // 需要认证但未登录
  if (requireAuth && !isAuthenticated) {
    if (showToast && !hasShownToast.current) {
      permissionToast.unauthorized({
        customMessage: defaultLoginRequiredMessage,
        duration: 3000,
      });
      hasShownToast.current = true;
    }

    // 可以选择重定向到登录页
    useEffect(() => {
      const timer = setTimeout(() => {
        router.push('/admin/login');
      }, 1500);
      
      return () => clearTimeout(timer);
    }, [router]);

    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="text-center">
          <i className="fas fa-info-circle text-blue-500 text-3xl mb-2"></i>
          <p className="text-gray-600">{defaultLoginRequiredMessage}</p>
        </div>
      </div>
    );
  }

  // 权限不足，显示fallback
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  // 有权限，显示子组件
  return <>{children}</>;
}

/**
 * 简化的权限守卫组件
 * 只需要传入权限代码
 */
export function SimplePermissionGuard({
  code,
  children,
  fallback = null,
}: {
  code: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard code={code} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * 页面权限守卫组件
 */
export function PagePermissionGuard({
  pagePath,
  children,
  fallback = null,
}: {
  pagePath: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard pagePath={pagePath} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * 管理员权限守卫组件
 */
export function AdminGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAdminOrSuperuser } = usePermissions();

  if (!isAdminOrSuperuser) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 超级用户权限守卫组件
 */
export function SuperuserGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isSuperuser } = usePermissions();

  if (!isSuperuser()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 角色守卫组件
 */
export function RoleGuard({
  roleName,
  children,
  fallback = null,
}: {
  roleName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasRole } = usePermissions();

  if (!hasRole(roleName)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * 多权限守卫组件（任一权限即可）
 */
export function AnyPermissionGuard({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard anyPermissions={permissions} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * 多权限守卫组件（需要所有权限）
 */
export function AllPermissionsGuard({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard allPermissions={permissions} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
