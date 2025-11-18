/**
 * 统一API响应格式工具
 * 提供标准化的API响应结构，确保前后端数据格式一致性
 */

// 标准成功响应格式
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

// 标准错误响应格式
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

// 分页数据格式
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建分页成功响应
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): ApiResponse<PaginatedData<T>> {
  const totalPages = Math.ceil(total / limit);
  return createSuccessResponse({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }, message);
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  statusCode: number = 500
): { response: ApiError; status: number } {
  return {
    response: {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString()
    },
    status: statusCode
  };
}

/**
 * 常用错误响应
 */
export const ErrorResponses = {
  // 认证相关
  unauthorized: (message = '未授权访问') => 
    createErrorResponse('UNAUTHORIZED', message, undefined, 401),
  
  forbidden: (message = '权限不足') => 
    createErrorResponse('FORBIDDEN', message, undefined, 403),
  
  // 请求相关
  badRequest: (message = '请求参数错误', details?: any) => 
    createErrorResponse('BAD_REQUEST', message, details, 400),
  
  notFound: (message = '资源不存在') => 
    createErrorResponse('NOT_FOUND', message, undefined, 404),
  
  // 服务器相关
  internalError: (message = '服务器内部错误', details?: any) => 
    createErrorResponse('INTERNAL_ERROR', message, details),
  
  databaseError: (message = '数据库操作失败', details?: any) => 
    createErrorResponse('DATABASE_ERROR', message, details),
  
  // 业务相关
  validationError: (message = '数据验证失败', details?: any) => 
    createErrorResponse('VALIDATION_ERROR', message, details, 400),
  
  conflict: (message = '数据冲突') => 
    createErrorResponse('CONFLICT', message, undefined, 409)
};

/**
 * Next.js API路由专用响应工具
 */
export class ApiRouteResponse {
  /**
   * 发送成功响应
   */
  static success<T>(data: T, message?: string, status: number = 200) {
    return new Response(JSON.stringify(createSuccessResponse(data, message)), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  /**
   * 发送分页响应
   */
  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ) {
    const response = createPaginatedResponse(items, page, limit, total, message);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  /**
   * 发送错误响应
   */
  static error(code: string, message: string, details?: any, status: number = 500) {
    const errorResponse = createErrorResponse(code, message, details, status);
    return new Response(JSON.stringify(errorResponse.response), {
      status: errorResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  /**
   * 使用预定义错误
   */
  static unauthorized(message?: string) {
    const errorResponse = ErrorResponses.unauthorized(message);
    return new Response(JSON.stringify(errorResponse.response), {
      status: errorResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  static forbidden(message?: string) {
    const errorResponse = ErrorResponses.forbidden(message);
    return new Response(JSON.stringify(errorResponse.response), {
      status: errorResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  static badRequest(message?: string, details?: any) {
    const errorResponse = ErrorResponses.badRequest(message, details);
    return new Response(JSON.stringify(errorResponse.response), {
      status: errorResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  static notFound(message?: string) {
    const errorResponse = ErrorResponses.notFound(message);
    return new Response(JSON.stringify(errorResponse.response), {
      status: errorResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  static internalError(message?: string, details?: any) {
    const errorResponse = ErrorResponses.internalError(message, details);
    return new Response(JSON.stringify(errorResponse.response), {
      status: errorResponse.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}