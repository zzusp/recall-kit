// API配置

export const apiConfig = {
  // 基础配置
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: parseInt(process.env.API_TIMEOUT || '15000'),
  retries: 2,
  
  // 响应配置
  response: {
    defaultSuccessMessage: '操作成功',
    defaultErrorMessage: '操作失败',
  },
  
  // 请求配置
  request: {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin' as RequestCredentials,
  },
  
  // 错误处理配置
  errorHandling: {
    logErrors: process.env.NODE_ENV !== 'production',
    showNotifications: true,
    retryOnNetworkError: true,
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    defaultTtl: 5 * 60 * 1000, // 5分钟
    maxAge: 60 * 60 * 1000, // 1小时
  },
  
  // 分页配置
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultPage: 1,
  },
  
  // 上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
};

export default apiConfig;