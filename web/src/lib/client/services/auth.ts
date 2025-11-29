// Client-side authentication service
// This file only contains client-side logic and API calls

import { getApiUrl } from '@/config/paths';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: any[];
  permissions: any[];
  is_superuser: boolean;
  created_at?: string;
  last_login_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Client-side session management
export function setSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('session_token', token);
    // 同时设置cookie，让middleware可以读取
    document.cookie = `session_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=strict`;
  }
}

export function getSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('session_token');
  }
  return null;
}

export function removeSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('session_token');
    // 同时删除cookie
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=strict';
  }
}

// API call to login
export async function login(credentials: LoginCredentials): Promise<{ user: AuthUser; sessionToken: string }> {
  const response = await fetch(getApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '登录失败');
  }

  const result = await response.json();
  
  // 处理统一API响应格式
  if (result.success && result.data) {
    return result.data;
  }
  
  return result;
}

// API call to logout
export async function logout(): Promise<void> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return;
  }

  const response = await fetch(getApiUrl('/api/auth/logout'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('退出登录失败');
  }

  removeSessionToken();
}

// API call to get current user
export async function getCurrentUser(): Promise<AuthUser | null> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return null;
  }

  const response = await fetch(getApiUrl('/api/auth/me'), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeSessionToken();
      return null;
    }
    throw new Error('获取用户信息失败');
  }

  return response.json();
}

// Permission checking
// 新的权限检查函数：使用 code 字段（function 类型）
export function hasPermission(user: AuthUser, code: string): boolean {
  if (user.is_superuser) {
    return true;
  }

  return user.permissions.some(
    permission => permission.type === 'function' && permission.code === code && permission.is_active
  );
}

// 兼容旧的 resource + action 调用方式
export function hasPermissionByResourceAction(user: AuthUser, resource: string, action: string): boolean {
  const code = `${resource}.${action}`;
  return hasPermission(user, code);
}

// 页面权限检查（page 类型）
export function hasPagePermission(user: AuthUser, pagePath: string): boolean {
  if (user.is_superuser) {
    return true;
  }

  return user.permissions.some(
    permission => permission.type === 'page' && permission.page_path === pagePath && permission.is_active
  );
}

// 模块权限检查（module 类型）
export function hasModulePermission(user: AuthUser, moduleCode: string): boolean {
  if (user.is_superuser) {
    return true;
  }

  return user.permissions.some(
    permission => permission.type === 'module' && permission.code === moduleCode && permission.is_active
  );
}

export function hasAnyPermission(user: AuthUser, permissions: Array<{ resource: string; action: string }>): boolean {
  if (user.is_superuser) {
    return true;
  }

  return permissions.some(({ resource, action }) => 
    hasPermissionByResourceAction(user, resource, action)
  );
}

export function hasRole(user: AuthUser, roleName: string): boolean {
  return user.roles.some(role => role.name === roleName);
}