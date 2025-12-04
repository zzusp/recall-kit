/**
 * RBAC (Role-Based Access Control) 统一权限检查中间件
 * 提供标准化的权限验证机制
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission, hasPagePermission, hasAnyPermission } from '@/lib/server/auth';
import { ErrorMessages } from '@/config/errorMessages';

/**
 * 权限检查结果接口
 */
export interface AuthResult {
  success: boolean;
  session?: any;
  error?: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_SESSION';
    message: string;
    status: number;
  };
}

/**
 * 基础认证检查 - 验证用户是否已登录
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: ErrorMessages.UNAUTHORIZED.sessionExpired,
          status: 401
        }
      };
    }

    return {
      success: true,
      session
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_SESSION',
        message: '会话验证失败',
        status: 401
      }
    };
  }
}

/**
 * 权限认证检查 - 验证用户是否具有指定权限
 */
export async function requirePermission(permissionCode: string): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }

  if (!hasPermission(authResult.session!, permissionCode)) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: ErrorMessages.FORBIDDEN.needPermission(permissionCode),
        status: 403
      }
    };
  }

  return authResult;
}

/**
 * 页面权限检查 - 验证用户是否可以访问指定页面
 */
export async function requirePagePermission(pagePath: string): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }

  if (!hasPagePermission(authResult.session!, pagePath)) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: ErrorMessages.FORBIDDEN.cannotAccessPage(pagePath),
        status: 403
      }
    };
  }

  return authResult;
}

/**
 * 多权限检查 - 验证用户是否具有任一指定权限
 */
export async function requireAnyPermission(permissionCodes: string[]): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }

  if (!hasAnyPermission(authResult.session!, permissionCodes)) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: ErrorMessages.FORBIDDEN.needPermissions(permissionCodes),
        status: 403
      }
    };
  }

  return authResult;
}

/**
 * 管理员权限检查 - 验证用户是否为管理员或超级用户
 */
export async function requireAdmin(): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }

  const user = authResult.session!.user as any;
  if (!user.is_superuser && !user.roles?.some((role: any) => role.name === 'admin')) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: ErrorMessages.FORBIDDEN.needAdmin,
        status: 403
      }
    };
  }

  return authResult;
}

/**
 * 超级用户权限检查
 */
export async function requireSuperuser(): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }

  const user = authResult.session!.user as any;
  if (!user.is_superuser) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: ErrorMessages.FORBIDDEN.needSuperuser,
        status: 403
      }
    };
  }

  return authResult;
}

/**
 * API路由权限检查装饰器
 * 使用方法：
 * export const GET = withAuth('users.view')(async (request, session) => {
 *   // 业务逻辑
 * });
 */
export function withAuth(permissionCode?: string) {
  return function handler<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      let authResult: AuthResult;
      
      if (permissionCode) {
        authResult = await requirePermission(permissionCode);
      } else {
        authResult = await requireAuth();
      }

      if (!authResult.success) {
        return NextResponse.json(
          { 
            error: authResult.error!.message,
            code: authResult.error!.code
          },
          { status: authResult.error!.status }
        );
      }

      // 将session信息添加到请求头中，供业务逻辑使用
      const modifiedRequest = new NextRequest(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'x-user-session': JSON.stringify(authResult.session)
        }
      });

      return handler(modifiedRequest, ...args);
    };
  };
}

/**
 * 页面权限检查装饰器
 */
export function withPagePermission(pagePath: string) {
  return function handler<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return withAuth()(async (request: NextRequest, ...args: T) => {
      const authResult = await requirePagePermission(pagePath);
      
      if (!authResult.success) {
        return NextResponse.json(
          { 
            error: authResult.error!.message,
            code: authResult.error!.code
          },
          { status: authResult.error!.status }
        );
      }

      const modifiedRequest = new NextRequest(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'x-user-session': JSON.stringify(authResult.session)
        }
      });

      return handler(modifiedRequest, ...args);
    });
  };
}

/**
 * 管理员权限检查装饰器
 */
export function withAdmin() {
  return withAuth()(async (request: NextRequest) => {
    const authResult = await requireAdmin();
    
    if (!authResult.success) {
      return NextResponse.json(
        { 
          error: authResult.error!.message,
          code: authResult.error!.code
        },
        { status: authResult.error!.status }
      );
    }

    // 继续处理请求...
    return NextResponse.json({ message: 'Admin access granted' });
  });
}

/**
 * 从请求中提取用户会话信息
 */
export function extractSessionFromRequest(request: NextRequest): any {
  const sessionHeader = request.headers.get('x-user-session');
  if (!sessionHeader) {
    return null;
  }

  try {
    return JSON.parse(sessionHeader);
  } catch (error) {
    console.error('Failed to parse session from request header:', error);
    return null;
  }
}

/**
 * 快捷权限检查函数 - 用于API路由内部
 */
export function checkPermission(session: any, code: string): boolean {
  return hasPermission(session, code);
}

/**
 * 快捷页面权限检查函数
 */
export function checkPagePermission(session: any, pagePath: string): boolean {
  return hasPagePermission(session, pagePath);
}

/**
 * 权限验证错误处理
 */
export class AuthError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_SESSION',
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 抛出权限验证错误的快捷方法
 */
export function throwUnauthorized(message: string = '未授权访问'): never {
  throw new AuthError('UNAUTHORIZED', message, 401);
}

export function throwForbidden(message: string = '权限不足'): never {
  throw new AuthError('FORBIDDEN', message, 403);
}
