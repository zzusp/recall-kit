// 认证配置

export const authConfig = {
  // NextAuth.js 配置
  secret: process.env.NEXTAUTH_SECRET || 'your-session-secret',
  trustHost: true, // 信任主机（用于生产环境）
  
  // JWT配置
  jwt: {
    expiresIn: '7d',
    issuer: 'recall-kit',
    audience: 'recall-kit-users',
  },
  
  // Session配置
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    // secure 标志：如果设置了 COOKIE_SECURE 环境变量，使用该值；否则根据协议判断
    // 如果使用 HTTPS，secure 应该为 true；如果使用 HTTP，secure 应该为 false
    // 默认：如果 NODE_ENV 是 production 且没有明确设置，则根据 NEXT_PUBLIC_APP_URL 判断
    // 如果没有设置任何环境变量，默认使用 false（允许 HTTP）
    secure: process.env.COOKIE_SECURE === 'true' 
      ? true 
      : process.env.COOKIE_SECURE === 'false'
      ? false
      : (() => {
          // 如果设置了 APP_URL，根据协议判断
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
          if (appUrl.startsWith('https://')) {
            return true;
          }
          if (appUrl.startsWith('http://')) {
            return false;
          }
          // 默认：开发环境不使用 secure，生产环境也不使用（除非明确设置为 true）
          // 这样可以避免在 HTTP 环境下 cookie 无法发送的问题
          return false;
        })(),
    httpOnly: true,
    sameSite: 'lax' as const,
  },
  
  // 密码配置
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    saltRounds: 12,
  },
  
  // 认证路由
  routes: {
    login: '/admin/login',
    dashboard: '/admin/dashboard',
    protected: '/admin',
  },
  
  // 权限配置
  permissions: {
    superuser: {
      resource: 'system',
      action: 'admin',
    },
    admin: {
      resource: 'admin',
      action: 'access',
    },
  },
};

export default authConfig;