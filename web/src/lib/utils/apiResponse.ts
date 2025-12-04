/**
 * 统一的API响应工具
 * 标准化成功和错误响应格式
 */

import { NextResponse } from 'next/server';
import { ErrorMessages } from '@/config/errorMessages';

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 成功响应
 */
export class ApiRouteResponse {
  /**
   * 返回成功响应
   */
  static success<T = any>(
    data?: T,
    message: string = '操作成功',
    options?: {
      status?: number;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
  ) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
    };

    if (options?.pagination) {
      response.pagination = options.pagination;
    }

    return NextResponse.json(response, {
      status: options?.status || 200,
    });
  }

  /**
   * 返回创建成功响应
   */
  static created<T = any>(data?: T, message: string = '创建成功') {
    return this.success(data, message, { status: 201 });
  }

  /**
   * 返回无内容响应
   */
  static noContent(message: string = '操作成功') {
    return NextResponse.json(
      {
        success: true,
        message,
      },
      { status: 204 }
    );
  }
}

/**
 * 错误响应
 */
export class ApiRouteError {
  /**
   * 返回未授权错误
   */
  static unauthorized(message?: string) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: message || ErrorMessages.UNAUTHORIZED.apiMessage,
        },
      } as ApiResponse,
      { status: 401 }
    );
  }

  /**
   * 返回权限不足错误
   */
  static forbidden(message?: string) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: message || ErrorMessages.FORBIDDEN.apiMessage,
        },
      } as ApiResponse,
      { status: 403 }
    );
  }

  /**
   * 返回资源未找到错误
   */
  static notFound(message: string = '资源未找到') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message,
        },
      } as ApiResponse,
      { status: 404 }
    );
  }

  /**
   * 返回请求参数错误
   */
  static badRequest(message: string = '请求参数错误', details?: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message,
          details,
        },
      } as ApiResponse,
      { status: 400 }
    );
  }

  /**
   * 返回冲突错误
   */
  static conflict(message: string = '资源冲突', details?: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFLICT',
          message,
          details,
        },
      } as ApiResponse,
      { status: 409 }
    );
  }

  /**
   * 返回服务器内部错误
   */
  static internal(message: string = '服务器内部错误', details?: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          details,
        },
      } as ApiResponse,
      { status: 500 }
    );
  }

  /**
   * 返回自定义错误
   */
  static custom(
    code: string,
    message: string,
    status: number = 400,
    details?: any
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      } as ApiResponse,
      { status }
    );
  }
}

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * 转换为NextResponse
   */
  toResponse(): NextResponse {
    return ApiRouteError.custom(this.code, this.message, this.status, this.details);
  }
}

/**
 * 常用错误代码
 */
export const ErrorCodes = {
  // 认证相关
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // 资源相关
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // 请求相关
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  
  // 业务逻辑相关
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  
  // 系统相关
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * 快捷创建错误的函数
 */
export const createError = {
  unauthorized: (message?: string) => 
    new ApiError(ErrorCodes.UNAUTHORIZED, message || ErrorMessages.UNAUTHORIZED.apiMessage, 401),
  
  forbidden: (message?: string) => 
    new ApiError(ErrorCodes.FORBIDDEN, message || ErrorMessages.FORBIDDEN.apiMessage, 403),
  
  notFound: (message?: string) => 
    new ApiError(ErrorCodes.NOT_FOUND, message || '资源未找到', 404),
  
  badRequest: (message?: string, details?: any) => 
    new ApiError(ErrorCodes.BAD_REQUEST, message || '请求参数错误', 400, details),
  
  conflict: (message?: string, details?: any) => 
    new ApiError(ErrorCodes.CONFLICT, message || '资源冲突', 409, details),
  
  internal: (message?: string, details?: any) => 
    new ApiError(ErrorCodes.INTERNAL_ERROR, message || '服务器内部错误', 500, details),
};

/**
 * 错误处理装饰器
 * 自动捕获异常并转换为标准错误响应
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ApiError) {
        return error.toResponse();
      }

      // 处理数据库错误
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          return ApiRouteError.conflict('资源已存在', {
            originalError: error.message,
          });
        }

        if (error.message.includes('foreign key')) {
          return ApiRouteError.badRequest('引用的资源不存在', {
            originalError: error.message,
          });
        }

        if (error.message.includes('not null')) {
          return ApiRouteError.badRequest('必填字段不能为空', {
            originalError: error.message,
          });
        }
      }

      // 默认返回内部服务器错误
      return ApiRouteError.internal(
        process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : '服务器内部错误',
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }
  };
}

/**
 * 分页参数解析
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number = 20,
  maxLimit: number = 100
) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || defaultLimit.toString()))
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return ApiRouteResponse.success(data, '获取成功', {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// 导出默认的响应类，保持向后兼容
export default ApiRouteResponse;
