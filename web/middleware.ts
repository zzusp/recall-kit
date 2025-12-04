import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * 中间件：保护路由
 * 统一使用 NextAuth.js 进行鉴权
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保护管理员页面路由
  if (pathname.startsWith('/admin')) {
    // 允许访问登录页面和 NextAuth.js 的 API 路由
    if (pathname === '/admin/login' || pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // 验证用户会话
    const session = await auth();
    if (!session || !session.user) {
      // 构建登录 URL，如果有 basePath 则需要包含
      const loginUrl = new URL('/admin/login', request.url);
      // 添加回调 URL，登录后跳转回原页面
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 为 API 请求添加用户会话信息到请求头
  if (pathname.startsWith('/api/admin/')) {
    const session = await auth();
    if (session && session.user) {
      const requestHeaders = new Headers(request.headers);
      // 将用户会话信息添加到请求头，供 API 路由使用
      requestHeaders.set('X-User-Session', JSON.stringify(session));
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
