'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission, AuthUser } from '@/lib/client/services/auth';

interface PermissionGuardProps {
  children: ReactNode;
  resource?: string;
  action?: string;
  requireAuth?: boolean;
  fallback?: ReactNode;
}

export default function PermissionGuard({
  children,
  resource,
  action,
  requireAuth = true,
  fallback
}: PermissionGuardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

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

  // 如果 session 存在，检查权限
  if (session?.user) {
    const currentUser = session.user as any as AuthUser;

    // 检查特定权限
    if (resource && action && !hasPermission(currentUser, resource, action)) {
      return fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-yellow-500 text-5xl mb-4"></i>
            <h2 className="text-2xl font-bold mb-2">权限不足</h2>
            <p className="text-gray-600">您没有权限访问此页面</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Hook for checking permissions in components
export function usePermissions() {
  const { data: session, status } = useSession();
  const user = session?.user as any as AuthUser | null;
  const loading = status === 'loading';

  const checkPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    return hasPermission(user, resource, action);
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
    checkAnyPermission,
    hasRole
  };
}
