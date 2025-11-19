// 简单的错误处理工具，专门处理浏览器扩展错误
export function handleBrowserExtensionErrors() {
  // 监听未处理的错误
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      const message = event.message || '';
      const source = event.filename || '';
      
      // 检查是否是浏览器扩展错误
      if (message.includes('content_script') || 
          message.includes('fetchError') ||
          source.includes('chrome-extension://') ||
          source.includes('moz-extension://')) {
        
        console.warn('🔧 检测到浏览器扩展错误，建议：');
        console.warn('1. 暂时禁用所有浏览器扩展');
        console.warn('2. 刷新页面检查是否还有错误');
        console.warn('3. 逐个启用扩展以确定问题来源');
        
        // 避免原始错误影响应用
        event.preventDefault();
        return false;
      }
    });

    // 监听 Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || '';
      
      if (message.includes('content_script') || message.includes('fetchError')) {
        console.warn('🔧 浏览器扩展 Promise 错误已处理');
        event.preventDefault();
        return false;
      }
    });
  }
}

// 导出增强的 fetch 函数
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: options.timeout || 10000,
    });
    return response;
  } catch (error) {
    if (error.message.includes('content_script')) {
      console.warn('🔧 忽略浏览器扩展相关的网络错误');
      return new Response('{}', { status: 200, statusText: 'OK' });
    }
    throw error;
  }
}