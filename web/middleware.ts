import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// BasePath 配置，从环境变量读取，与 next.config.js 中的 basePath 保持一致
// 注意：在中间件中，环境变量需要以 NEXT_PUBLIC_ 开头才能在客户端使用
// 如果没有配置，则使用空字符串（按根路径处理）
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * 中间件：保护路由
 * 检查 session cookie 是否存在，并为 API 请求添加 Authorization header
 * 完整的 session 验证在页面/API 路由中进行
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const fullUrl = request.url;


  // 为 API 请求添加 Authorization header（从 cookie 中读取 session_token）
  if (pathname.startsWith('/api/')) {
    // 优先使用自定义的 session_token，其次尝试从 NextAuth.js session 中获取
    const sessionToken = request.cookies.get('session_token')?.value;
    
    // 如果有 session_token，直接使用
    if (sessionToken) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('Authorization', `Bearer ${sessionToken}`);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    // 如果没有 session_token，检查是否有 NextAuth.js session token
    // 注意：在 Edge Runtime 中无法直接验证 NextAuth.js session
    // 所以这里只是标记，实际验证在 API 路由中进行
    const nextAuthToken = 
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value ||
      request.cookies.get('__Host-next-auth.session-token')?.value;
    
    if (nextAuthToken) {
      // 在 header 中标记有 NextAuth.js session，API 路由可以据此获取用户信息
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('X-NextAuth-Session', 'true');
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // 保护管理员页面路由
  if (pathname.startsWith('/admin')) {
    // 允许访问登录页面和 NextAuth.js 的 API 路由
    if (pathname === '/admin/login' || pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // 检查 session token（优先使用自定义的 session_token，其次检查 NextAuth.js 的 cookie）
    const sessionToken = 
      request.cookies.get('session_token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value ||
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Host-next-auth.session-token')?.value;

    if (!sessionToken) {
      // 构建登录 URL，如果有 basePath 则需要包含
      const loginPath = BASE_PATH ? `${BASE_PATH}/admin/login` : '/admin/login';
      const loginUrl = new URL(loginPath, request.url);
      // 添加回调 URL，登录后跳转回原页面（回调 URL 也需要包含 basePath）
      const callbackPath = BASE_PATH ? `${BASE_PATH}${pathname}` : pathname;
      loginUrl.searchParams.set('callbackUrl', callbackPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (static files) - Next.js 会自动添加 basePath
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder 中的静态资源
     * 注意：basePath 会在中间件之前处理，所以这里匹配的是去除 basePath 后的路径
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|css|js)$).*)',
  ],
};