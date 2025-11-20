// 环境配置

export const environmentConfig = {
  // 基础环境配置
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // 应用配置
  app: {
    name: 'Recall Kit',
    version: process.env.npm_package_version || '1.0.0',
    description: 'AI开发踩坑记录检索平台',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  // AI服务配置
  ai: {
    serviceType: process.env.AI_SERVICE_TYPE || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'text-embedding-3-small',
    },
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
    enableConsole: true,
    enableFile: process.env.NODE_ENV === 'production',
  },
  
  // 性能配置
  performance: {
    enableProfiler: process.env.NODE_ENV === 'development',
    enableMetrics: process.env.NODE_ENV === 'production',
    enableTracing: false,
  },
  
  // 功能开关
  features: {
    vectorSearch: process.env.ENABLE_VECTOR_SEARCH !== 'false',
    fullTextSearch: true,
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    debugMode: process.env.NODE_ENV === 'development',
  },
  
  // 安全配置
  security: {
    enableCSRF: process.env.NODE_ENV === 'production',
    enableRateLimit: true,
    enableCORS: true,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
};

// 环境变量验证
export function validateEnvironment(): void {
  const requiredEnvVars = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  if (environmentConfig.isProduction) {
    const prodRequiredVars = ['JWT_SECRET', 'SESSION_SECRET'];
    const missingProdVars = prodRequiredVars.filter(varName => !process.env[varName]);
    
    if (missingProdVars.length > 0) {
      throw new Error(`Missing required production environment variables: ${missingProdVars.join(', ')}`);
    }
  }
}

export default environmentConfig;