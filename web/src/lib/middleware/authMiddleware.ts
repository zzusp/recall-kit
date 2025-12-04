import { NextResponse, type NextRequest } from 'next/server';

/**
 * 中间件：在 Edge Runtime 中运行
 * 注意：Edge Runtime 不支持数据库查询，这里只做基本检查
 * 完整的 session 验证和权限检查在 API 路由中进行
 */
export async function middleware(req: NextRequest) {
  // 为API请求添加Authorization头
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const sessionToken = req.cookies.get('session_token')?.value;
    
    if (sessionToken) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('Authorization', `Bearer ${sessionToken}`);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // 保护管理员页面路由
  if (req.nextUrl.pathname.startsWith('/admin')) {
    // 允许访问登录页面和个人相关页面
    const allowedPages = [
      '/admin/login',
      '/admin/user-dashboard',
      '/admin/my-experiences',
      '/admin/profile-settings',
      '/admin/api-keys'
    ];
    
    if (allowedPages.some(page => req.nextUrl.pathname.startsWith(page))) {
      return NextResponse.next();
    }

    const sessionToken = req.cookies.get('session_token')?.value;
    
    // 基本检查：验证 token 是否存在
    // 更详细的权限检查在页面组件中使用 PermissionGuard 进行
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
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