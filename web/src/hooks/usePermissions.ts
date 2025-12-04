/**
 * 统一的权限检查 Hook
 * 基于NextAuth.js的会话管理
 */

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

/**
 * 权限检查 Hook
 */
export function usePermissions() {
  const { data: session, status } = useSession();

  // 计算权限相关的状态
  const permissions = useMemo(() => {
    const isLoading = status === 'loading';
    const isAuthenticated = !!session?.user;

    if (!session?.user) {
      return {
        // 权限检查函数
        hasPermission: () => false,
        hasPagePermission: () => false,
        hasModulePermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        hasPermissionByResourceAction: () => false,
        hasRole: () => false,
        isAdminOrSuperuser: () => false,
        isSuperuser: (): boolean => false,
        
        // 权限获取函数
        getUserPermissionCodes: () => [],
        getUserPagePaths: () => [],
        
        // 状态
        isAuthenticated: false,
        isLoading: isLoading,
        
        // 用户信息
        user: null,
        roles: [],
        permissions: [],
      };
    }

    const user = session.user as any;

    // 检查用户是否具有指定权限（使用 code 字段，function 类型）
    const hasPermission = (code: string): boolean => {
      if (user.is_superuser) return true;
      if (!user.permissions) return false;
      
      return user.permissions.some(
        (permission: any) => 
          permission.type === 'function' && 
          permission.code === code && 
          permission.is_active
      );
    };

    // 检查用户是否具有页面权限（page 类型）
    const hasPagePermission = (pagePath: string): boolean => {
      if (user.is_superuser) return true;
      if (!user.permissions) return false;
      
      return user.permissions.some(
        (permission: any) => 
          permission.type === 'page' && 
          permission.page_path === pagePath && 
          permission.is_active
      );
    };

    // 检查用户是否具有模块权限（module 类型）
    const hasModulePermission = (moduleCode: string): boolean => {
      if (user.is_superuser) return true;
      if (!user.permissions) return false;
      
      return user.permissions.some(
        (permission: any) => 
          permission.type === 'module' && 
          permission.code === moduleCode && 
          permission.is_active
      );
    };

    // 检查用户是否具有任一指定权限
    const hasAnyPermission = (codes: string[]): boolean => {
      if (user.is_superuser) return true;
      return codes.some(code => hasPermission(code));
    };

    // 检查用户是否具有所有指定权限
    const hasAllPermissions = (codes: string[]): boolean => {
      if (user.is_superuser) return true;
      return codes.every(code => hasPermission(code));
    };

    // 兼容旧的 resource + action 调用方式
    const hasPermissionByResourceAction = (resource: string, action: string): boolean => {
      const code = `${resource}.${action}`;
      return hasPermission(code);
    };

    // 检查用户是否具有指定角色
    const hasRole = (roleName: string): boolean => {
      if (!user.roles) return false;
      return user.roles.some((role: any) => role.name === roleName);
    };

    // 检查用户是否为管理员或超级用户
    const isAdminOrSuperuser = (): boolean => {
      return user.is_superuser || hasRole('admin');
    };

    // 检查用户是否为超级用户
    const isSuperuser = (): boolean => {
      return user.is_superuser === true;
    };

    // 获取用户所有权限代码
    const getUserPermissionCodes = (): string[] => {
      if (user.is_superuser) return ['*']; // 超级用户拥有所有权限
      if (!user.permissions) return [];
      
      return user.permissions
        .filter((permission: any) => 
          permission.is_active && 
          permission.type === 'function' && 
          permission.code
        )
        .map((permission: any) => permission.code);
    };

    // 获取用户所有页面权限路径
    const getUserPagePaths = (): string[] => {
      if (user.is_superuser) return ['*']; // 超级用户可访问所有页面
      if (!user.permissions) return [];
      
      return user.permissions
        .filter((permission: any) => 
          permission.is_active && 
          permission.type === 'page' && 
          permission.page_path
        )
        .map((permission: any) => permission.page_path);
    };

    return {
      // 权限检查函数
      hasPermission,
      hasPagePermission,
      hasModulePermission,
      hasAnyPermission,
      hasAllPermissions,
      hasPermissionByResourceAction,
      hasRole,
      isAdminOrSuperuser,
      isSuperuser,
      
      // 权限获取函数
      getUserPermissionCodes,
      getUserPagePaths,
      
      // 状态
      isAuthenticated: isAuthenticated,
      isLoading: isLoading,
      
      // 用户信息
      user,
      roles: user.roles || [],
      permissions: user.permissions || [],
    };
  }, [session, status]);

  return permissions;
}

/**
 * 简化的权限检查 Hook
 * 只返回基本的权限检查函数
 */
export function useSimplePermissions() {
  const { data: session } = useSession();

  const hasPermission = (code: string): boolean => {
    if (!session?.user) return false;
    
    const user = session.user as any;
    if (user.is_superuser) return true;
    if (!user.permissions) return false;
    
    return user.permissions.some(
      (permission: any) => 
        permission.type === 'function' && 
        permission.code === code && 
        permission.is_active
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!session?.user) return false;
    
    const user = session.user as any;
    if (!user.roles) return false;
    return user.roles.some((role: any) => role.name === roleName);
  };

  const isAdmin = (): boolean => {
    if (!session?.user) return false;
    const user = session.user as any;
    return user.is_superuser || hasRole('admin');
  };

  return {
    hasPermission,
    hasRole,
    isAdmin,
    isAuthenticated: !!session?.user,
    user: session?.user,
  };
}

/**
 * 页面权限检查 Hook
 * 专门用于检查页面访问权限
 */
export function usePagePermissions() {
  const { hasPagePermission, isSuperuser } = usePermissions();

  const canAccessPage = (pagePath: string): boolean => {
    // 超级用户可以访问所有页面
    if (isSuperuser()) return true;
    
    // 检查页面权限
    return hasPagePermission(pagePath);
  };

  const canAccessAnyPage = (pagePaths: string[]): boolean => {
    // 超级用户可以访问所有页面
    if (isSuperuser()) return true;
    
    // 检查是否有任一页面权限
    return pagePaths.some(path => hasPagePermission(path));
  };

  const canAccessAllPages = (pagePaths: string[]): boolean => {
    // 超级用户可以访问所有页面
    if (isSuperuser()) return true;
    
    // 检查是否有所有页面权限
    return pagePaths.every(path => hasPagePermission(path));
  };

  return {
    canAccessPage,
    canAccessAnyPage,
    canAccessAllPages,
    hasPagePermission,
  };
}

/**
 * 功能权限检查 Hook
 * 专门用于检查功能操作权限
 */
export function useFunctionPermissions() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperuser } = usePermissions();

  const canPerformAction = (code: string): boolean => {
    // 超级用户可以执行所有操作
    if (isSuperuser()) return true;
    return hasPermission(code);
  };

  const canPerformAnyAction = (codes: string[]): boolean => {
    // 超级用户可以执行所有操作
    if (isSuperuser()) return true;
    return hasAnyPermission(codes);
  };

  const canPerformAllActions = (codes: string[]): boolean => {
    // 超级用户可以执行所有操作
    if (isSuperuser()) return true;
    return hasAllPermissions(codes);
  };

  return {
    canPerformAction,
    canPerformAnyAction,
    canPerformAllActions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
