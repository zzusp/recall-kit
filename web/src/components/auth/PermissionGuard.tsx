'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, hasPagePermission, hasPermissionByResourceAction, AuthUser } from '@/lib/client/services/auth';
import { toast } from '@/lib/client/services/toast';

interface PermissionGuardProps {
  children: ReactNode;
  // 新的权限检查方式（使用 code）
  code?: string;
  // 页面权限检查（使用 page_path）
  pagePath?: string;
  // 兼容旧的 resource + action 方式
  resource?: string;
  action?: string;
  requireAuth?: boolean;
  fallback?: ReactNode;
}

export default function PermissionGuard({
  children,
  code,
  pagePath,
  resource,
  action,
  requireAuth = true,
  fallback
}: PermissionGuardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const hasShownToast = useRef(false);

  // 检查权限（必须在所有 hooks 调用之前计算）
  let hasAccess = true;
  if (session?.user) {
    const currentUser = session.user as any as AuthUser;

    // 优先使用新的权限检查方式
    if (code) {
      hasAccess = hasPermission(currentUser, code);
    } else if (pagePath) {
      hasAccess = hasPagePermission(currentUser, pagePath);
    } else if (resource && action) {
      // 兼容旧的 resource + action 方式
      hasAccess = hasPermissionByResourceAction(currentUser, resource, action);
    }
  }

  // 如果没有权限，显示 toast 提示（必须在条件 return 之前调用）
  useEffect(() => {
    if (!hasAccess && !hasShownToast.current && status !== 'loading') {
      toast.warning('您没有权限访问此页面', {
        title: '权限不足',
        duration: 5000
      });
      hasShownToast.current = true;
    }
  }, [hasAccess, status]);

  // 重置 toast 标志（当权限检查通过时）
  useEffect(() => {
    if (hasAccess) {
      hasShownToast.current = false;
    }
  }, [hasAccess]);

  // 如果 session 还在加载中，显示加载状态
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>验证权限中...</p>
        </div>
      </div>
    );
  }

  // 如果需要认证但没有 session，重定向到登录页
  if (requireAuth && (status === 'unauthenticated' || !session)) {
    router.push('/admin/login');
    return null;
  }

  // 如果没有权限，显示无权限提示页面
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-yellow-500 text-5xl mb-4"></i>
          <h2 className="text-2xl font-bold mb-2">权限不足</h2>
          <p className="text-gray-600 mb-4">您没有权限访问此页面</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook for checking permissions in components
export function usePermissions() {
  const { data: session, status } = useSession();
  const user = session?.user as any as AuthUser | null;
  const loading = status === 'loading';

  const checkPermission = (codeOrResource: string, action?: string): boolean => {
    if (!user) return false;
    // 如果提供了 action，说明是旧的 resource + action 方式
    if (action) {
      return hasPermissionByResourceAction(user, codeOrResource, action);
    }
    // 否则使用新的 code 方式
    return hasPermission(user, codeOrResource);
  };

  const checkPermissionByResourceAction = (resource: string, action: string): boolean => {
    if (!user) return false;
    return hasPermissionByResourceAction(user, resource, action);
  };

  const checkPagePermission = (pagePath: string): boolean => {
    if (!user) return false;
    return hasPagePermission(user, pagePath);
  };

  const checkAnyPermission = (permissions: Array<{ resource: string; action: string }>): boolean => {
    if (!user) return false;
    return user.is_superuser || permissions.some(({ resource, action }) => 
      checkPermission(resource, action)
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.roles.some(role => role.name === roleName);
  };

  return {
    user,
    loading,
    checkPermission,
    checkPermissionByResourceAction,
    checkPagePermission,
    checkAnyPermission,
    hasRole
  };
}
