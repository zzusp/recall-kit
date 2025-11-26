'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getSessionToken, hasPermission, AuthUser } from '@/lib/client/services/auth';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionToken = getSessionToken();
        
        if (!sessionToken) {
          if (requireAuth) {
            router.push('/admin/login');
            return;
          }
          setLoading(false);
          return;
        }

        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          if (requireAuth) {
            router.push('/admin/login');
            return;
          }
          setLoading(false);
          return;
        }

        // Check specific permission if required
        if (resource && action && !hasPermission(currentUser, resource, action)) {
          router.push('/admin/dashboard'); // Redirect to dashboard if no permission
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        if (requireAuth) {
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [resource, action, requireAuth, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>验证权限中...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null; // Will redirect
  }

  if (resource && action && user && !hasPermission(user, resource, action)) {
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

  return <>{children}</>;
}

// Hook for checking permissions in components
export function usePermissions() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const sessionToken = getSessionToken();
        if (sessionToken) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

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
