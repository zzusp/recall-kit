import { toast } from './toast';
import { signOut } from 'next-auth/react';
import { getSessionToken } from './auth';
import { getApiUrl, BASE_PATH, getFullPath } from '@/config/paths';

/**
 * 统一的 API 错误处理
 */
export async function handleApiError(response: Response): Promise<never> {
  const status = response.status;
  
  // 尝试解析错误消息
  let errorMessage = '操作失败';
  try {
    const data = await response.json();
    if (data?.error?.message) {
      errorMessage = data.error.message;
    } else if (data?.message) {
      errorMessage = data.message;
    }
  } catch {
    // 如果无法解析 JSON，使用默认消息
  }

  switch (status) {
    case 401:
      // 未授权，重定向到登录页
      toast.warning('登录已过期，请重新登录', {
        title: '未授权',
        duration: 3000
      });
      // 延迟跳转，让用户看到提示
      // 注意：signOut 的 callbackUrl 需要使用 getFullPath 添加 basePath
      setTimeout(() => {
        signOut({ callbackUrl: getFullPath('/admin/login') });
      }, 1000);
      throw new Error('UNAUTHORIZED');
      
    case 403:
      // 权限不足
      toast.warning(errorMessage || '您没有权限执行此操作', {
        title: '权限不足',
        duration: 5000
      });
      throw new Error('FORBIDDEN');
      
    case 500:
      // 服务器错误
      toast.error(errorMessage || '服务器内部错误，请稍后重试', {
        title: '服务器错误',
        duration: 5000
      });
      throw new Error('INTERNAL_SERVER_ERROR');
      
    default:
      // 其他错误
      toast.error(errorMessage || `请求失败 (${status})`, {
        title: '请求错误',
        duration: 5000
      });
      throw new Error(`HTTP_${status}`);
  }
}

/**
 * 统一的 fetch 包装器，自动处理错误
 * @param url 请求 URL（相对路径，会自动添加 basePath）
 * @param options fetch 选项
 * @returns Promise<T> 返回解析后的数据
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // 自动添加 basePath
  const fullUrl = getApiUrl(url);
  
  // 自动添加 Authorization header
  const sessionToken = getSessionToken();
  
  // 处理 headers：支持 Headers 对象、普通对象或 undefined
  let headers: Headers;
  if (options.headers instanceof Headers) {
    headers = new Headers(options.headers);
  } else if (options.headers) {
    headers = new Headers(options.headers as Record<string, string>);
  } else {
    headers = new Headers();
  }
  
  // 如果请求中没有 Authorization header，且存在 session token，则自动添加
  if (!headers.has('Authorization') && sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  
  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include', // 确保发送 cookie
  });

  // 如果响应成功，尝试解析 JSON
  if (response.ok) {
    try {
      const data = await response.json();
      // 如果返回的是标准 API 响应格式
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          return data.data !== undefined ? data.data : data;
        } else {
          // 业务错误，但 HTTP 状态码是 200
          const errorMessage = data.error?.message || data.message || '操作失败';
          toast.error(errorMessage, {
            title: '操作失败',
            duration: 5000
          });
          throw new Error(errorMessage);
        }
      }
      return data;
    } catch (error) {
      // 如果不是 JSON，返回原始响应
      if (error instanceof SyntaxError) {
        return response as any;
      }
      throw error;
    }
  }

  // 处理错误状态码
  await handleApiError(response);
  throw new Error('Unreachable'); // 这行代码不会执行，但 TypeScript 需要
}

