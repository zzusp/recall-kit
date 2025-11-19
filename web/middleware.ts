import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log('Middleware called for:', req.nextUrl.pathname);
  
  // 为API请求添加Authorization头
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const sessionToken = req.cookies.get('session_token')?.value;
    console.log('Session token from cookie:', sessionToken ? 'found' : 'not found');
    
    if (sessionToken) {
      console.log('Adding Authorization header');
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
    // 允许访问登录页面
    if (req.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }

    const sessionToken = req.cookies.get('session_token')?.value;
    
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