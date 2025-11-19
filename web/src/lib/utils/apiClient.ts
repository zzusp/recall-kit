/**
 * 统一API客户端
 * 处理统一API响应格式的前端适配
 */

import { safeFetch, errorHandler } from './errorHandler';

// 统一API响应类型
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

export type ApiResult<T = any> = ApiResponse<T> | ApiError;

/**
 * API客户端类
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const fullUrl = this.baseUrl ? `${this.baseUrl}${url}` : url;
    
    try {
      const response = await safeFetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
        retries: 2,
        timeout: 15000,
      });

      const result: ApiResult<T> = await response.json();

      if (!response.ok) {
        // 处理HTTP错误状态
        if (result.success === false) {
          throw new ApiError(result.error.message, result.error.code, result.error.details);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success === false) {
        // 处理业务错误
        throw new ApiError(result.error.message, result.error.code, result.error.details);
      }

      return result.data;
    } catch (error) {
      errorHandler.log(error as Error, 'api');
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get<T>(url: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T>(url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT请求
   */
  async put<T>(url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(url: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  async patch<T>(url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

/**
 * 自定义API错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 创建带认证的API客户端
 */
export function createAuthenticatedApiClient(token: string) {
  return new ApiClient().withAuth(token);
}

// 扩展ApiClient类以支持认证
declare module './apiClient' {
  interface ApiClient {
    withAuth(token: string): ApiClient;
  }
}

ApiClient.prototype.withAuth = function(token: string) {
  const client = new ApiClient(this.baseUrl);
  const originalRequest = client.request.bind(client);
  
  client.request = async function<T>(url: string, options: RequestInit = {}) {
    return originalRequest<T>(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  };
  
  return client;
};

// 默认实例
export const apiClient = new ApiClient();

// 便捷方法
export const api = {
  get: <T>(url: string, options?: RequestInit) => apiClient.get<T>(url, options),
  post: <T>(url: string, data?: any, options?: RequestInit) => apiClient.post<T>(url, data, options),
  put: <T>(url: string, data?: any, options?: RequestInit) => apiClient.put<T>(url, data, options),
  delete: <T>(url: string, options?: RequestInit) => apiClient.delete<T>(url, options),
  patch: <T>(url: string, data?: any, options?: RequestInit) => apiClient.patch<T>(url, data, options),
};

/**
 * React Hook for API calls
 */
import { useState, useEffect, useCallback } from 'react';

export interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('Unknown error', 'UNKNOWN_ERROR');
      setError(apiError);
      options.onError?.(apiError);
    } finally {
      setLoading(false);
    }
  }, [apiCall, options]);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [execute, options.immediate]);

  return {
    data,
    loading,
    error,
    execute,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    }
  };
}