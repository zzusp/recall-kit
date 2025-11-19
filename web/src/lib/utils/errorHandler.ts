/**
 * 全局错误处理器
 * 处理网络请求和其他运行时错误
 */

export interface ErrorInfo {
  type: 'network' | 'api' | 'runtime' | 'unknown';
  message: string;
  stack?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
}

class ErrorHandler {
  private errors: ErrorInfo[] = [];
  private maxErrors = 100;

  /**
   * 记录错误
   */
  log(error: Error | string, type: ErrorInfo['type'] = 'unknown'): void {
    const errorInfo: ErrorInfo = {
      type,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    this.errors.push(errorInfo);
    
    // 保持错误数量在限制内
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // 在开发环境中输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', errorInfo);
    }

    // 检查是否是浏览器扩展错误
    if (this.isBrowserExtensionError(errorInfo)) {
      console.warn('检测到浏览器扩展相关错误，建议禁用扩展后重试');
    }
  }

  /**
   * 检查是否是浏览器扩展错误
   */
  private isBrowserExtensionError(errorInfo: ErrorInfo): boolean {
    const extensionKeywords = [
      'content_script',
      'chrome-extension://',
      'moz-extension://',
      'extension://',
      'sendMessage',
      'runtime'
    ];

    return extensionKeywords.some(keyword => 
      errorInfo.message.includes(keyword) || 
      errorInfo.stack?.includes(keyword) ||
      errorInfo.url?.includes(keyword)
    );
  }

  /**
   * 获取所有错误
   */
  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errors.slice(-count);
  }

  /**
   * 清除错误记录
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * 获取错误统计
   */
  getStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    
    this.errors.forEach(error => {
      const key = `${error.type}: ${error.message.split(':')[0]}`;
      stats[key] = (stats[key] || 0) + 1;
    });

    return stats;
  }
}

// 创建全局实例
export const errorHandler = new ErrorHandler();

// 设置全局错误处理
if (typeof window !== 'undefined') {
  // 处理未捕获的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.log(event.reason, 'runtime');
  });

  // 处理未捕获的 JavaScript 错误
  window.addEventListener('error', (event) => {
    errorHandler.log(event.error || event.message, 'runtime');
  });
}

/**
 * 增强的 fetch 包装器
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { retries?: number; timeout?: number }
): Promise<Response> {
  const { retries = 3, timeout = 10000, ...fetchInit } = init || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(input, {
          ...fetchInit,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (i === retries) {
          break;
        }

        // 指数退避重试
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    clearTimeout(timeoutId);
    errorHandler.log(lastError!, 'network');
    throw lastError!;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`);
      errorHandler.log(timeoutError, 'network');
      throw timeoutError;
    }

    errorHandler.log(error as Error, 'network');
    throw error;
  }
}

export default errorHandler;