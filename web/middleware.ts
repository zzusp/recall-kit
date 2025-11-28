import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 中间件：保护路由
 * 检查 NextAuth.js 的 session cookie 是否存在
 * 完整的 session 验证在页面/API 路由中进行
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保护管理员页面路由
  if (pathname.startsWith('/admin')) {
    // 允许访问登录页面和 NextAuth.js 的 API 路由
    if (pathname === '/admin/login' || pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // 检查 NextAuth.js 的 session cookie
    // NextAuth.js v5 根据环境使用不同的 cookie 名称
    const sessionToken = 
      request.cookies.get('__Secure-next-auth.session-token')?.value ||
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Host-next-auth.session-token')?.value;

    if (!sessionToken) {
      // 调试：在开发环境输出所有 cookie
      if (process.env.NODE_ENV === 'development') {
        const allCookies = Array.from(request.cookies.getAll()).map(c => c.name);
        console.log(`[Middleware] No NextAuth session cookie found for path: ${pathname}`);
        console.log(`[Middleware] Available cookies:`, allCookies);
      }
      const loginUrl = new URL('/admin/login', request.url);
      // 添加回调 URL，登录后跳转回原页面
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};