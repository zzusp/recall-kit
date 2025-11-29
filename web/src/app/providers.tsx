'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, useMemo } from 'react';
import type { Session } from 'next-auth';

/**
 * Providers 组件
 * 在 Next.js App Router 中，当设置了 basePath 后，NextAuth v5 应该能够自动处理
 * 
 * 优化：直接传递服务端获取的 session，避免客户端请求 /api/auth/session
 * 这样可以减少偶发的 404 错误，特别是在开发环境中
 */
export function Providers({ 
  children, 
  session 
}: { 
  children: ReactNode;
  session?: Session | null;
}) {
  // 使用 useMemo 确保 basePath 在首次渲染时就已经准备好
  // 根据 Next.js 官方文档，process.env.NEXT_PUBLIC_BASE_PATH 在构建时就已经内联
  // 所以在服务端和客户端都应该立即可用
  const basePath = useMemo(() => {
    // 从环境变量读取（构建时内联，官方推荐方式）
    // 如果环境变量未设置，返回空字符串（按根路径处理）
    return process.env.NEXT_PUBLIC_BASE_PATH || '';
  }, []);
  
  // 如果没有 basePath，authBasePath 就是 '/api/auth'
  // 如果有 basePath，authBasePath 就是 '/web/api/auth'
  const authBasePath = useMemo(() => {
    if (!basePath) {
      return '/api/auth';
    }
    return `${basePath}/api/auth`;
  }, [basePath]);
  
  // NextAuth v5 的 SessionProvider 支持直接传递 session
  // 如果传递了 session，客户端将不会立即请求 /api/auth/session
  // 这样可以避免开发环境中的偶发 404 错误
  // 
  // 注意：即使传递了 session，SessionProvider 可能仍然会在后台验证/刷新 session
  // 这是 NextAuth 的正常行为，用于确保 session 是最新的
  // 开发环境中的 404 可能是路由编译时机问题，不影响功能
  // 
  // 关于 basePath：
  // - 如果设置了 Next.js basePath，需要显式传递 basePath 给 SessionProvider
  //   这样 signIn、signOut、update 等操作才能正确找到 API 路径
  // - 如果没有设置 basePath，可以不传递，让 NextAuth 自动推断（通过 trustHost: true）
  // - 测试：如果移除 basePath 后 signIn/signOut 等操作失败，则需要保留
  return (
    <SessionProvider 
      session={session}
      refetchInterval={0} // 禁用自动刷新，因为我们已经在服务端获取了 session
      refetchOnWindowFocus={false} // 禁用窗口聚焦时的自动刷新
      refetchWhenOffline={false} // 禁用离线时的刷新
      {...(basePath ? { basePath: authBasePath } : {})}
    >
      {children}
    </SessionProvider>
  );
}

