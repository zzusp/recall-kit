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
    secure: process.env.NODE_ENV === 'production',
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