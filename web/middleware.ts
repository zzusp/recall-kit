import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // 保护管理员路由
  if (req.nextUrl.pathname.startsWith('/admin')) {
    // 允许访问登录页面
    if (req.nextUrl.pathname === '/admin/login') {
      return response;
    }

    // 检查自定义认证 - 优先从Authorization头获取，fallback到cookie
    const sessionToken = req.headers.get('authorization')?.replace('Bearer ', '') ||
                       req.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // 验证session - 直接查询数据库避免循环调用API
    try {
      // 这里我们需要导入数据库客户端，但为了简化，
      // 让我们创建一个简化的验证逻辑，只检查session是否存在
      const { db } = await import('@/lib/db/client');
      
      const sessionResult = await db.query(
        'SELECT user_id, expires_at FROM user_sessions WHERE session_token = $1',
        [sessionToken]
      );

      if (sessionResult.rows.length === 0) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }

      const session = sessionResult.rows[0];

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        await db.query(
          'DELETE FROM user_sessions WHERE session_token = $1',
          [sessionToken]
        );
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }

      // Get user details and check admin role
      const userResult = await db.query(`
        SELECT u.is_superuser, r.name as role_name
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1 AND u.is_active = true
      `, [session.user_id]);

      if (userResult.rows.length === 0) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }

      const userRoles = userResult.rows.map(row => row.role_name).filter(Boolean);
      const isSuperuser = userResult.rows[0]?.is_superuser;
      
      // Check if user is admin
      const isAdmin = isSuperuser || userRoles.includes('admin');
      
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }

    } catch (error) {
      console.error('Middleware auth error:', error);
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

