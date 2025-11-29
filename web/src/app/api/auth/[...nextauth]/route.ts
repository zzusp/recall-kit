import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/server/db/client';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/config/auth';
import type { NextRequest } from 'next/server';

/**
 * NextAuth.js v5 配置
 * 使用 Credentials Provider 适配现有的数据库用户系统
 * 
 * 关于 basePath 和 URL 配置：
 * - NextAuth v5 会自动从请求头推断 URL，通常不需要手动配置 AUTH_URL
 * - 根据官方文档（https://authjs.dev/getting-started/deployment#environment-variables）：
 *   "AUTH_URL is mostly unnecessary with v5 as the host is inferred from the request headers.
 *    However, if you are using a different base path, you can set this environment variable as well.
 *    For example, AUTH_URL=http://localhost:3000/web/auth or AUTH_URL=https://company.com/app1/auth"
 * 
 * 重要发现：
 * - 官方文档的例子是 `/web/auth`，但我们的路由是 `/api/auth/[...nextauth]`，所以完整路径是 `/web/api/auth`
 * - 如果按照官方例子设置 AUTH_URL=http://localhost:3000/web/auth，路径不匹配（缺少 /api）
 * - 如果设置 AUTH_URL=http://localhost:3000/web/api/auth，而 SessionProvider 的 basePath 也是 `/web/api/auth`，
 *   可能导致路径被重复处理，从而出现 400 错误
 * - 不设置 AUTH_URL 时，NextAuth 可以自动推断，并且 SessionProvider 的 basePath 会正确处理，所以正常工作
 * 
 * 解决方案：不设置 AUTH_URL，让 NextAuth 从请求头自动推断，它会正确处理 basePath
 * - 设置 trustHost: true 可以让 NextAuth 信任反向代理的请求头，这对于 basePath 场景很重要
 * - SessionProvider 的 basePath 属性用于客户端，应该设置为包含 /api/auth 的完整路径（已在 providers.tsx 中正确设置）
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authConfig.secret,
  trustHost: true, // 信任主机，NextAuth 会尝试自动识别 URL（包括 basePath）
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // 查询用户
          const userResult = await db.query(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
            [credentials.username as string]
          );

          if (userResult.rows.length === 0) {
            return null;
          }

          const user = userResult.rows[0];

          // 验证密码
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          );

          if (!isPasswordValid) {
            return null;
          }

          // 获取用户角色和权限
          const userRolesResult = await db.query(`
            SELECT r.id, r.name, r.description, r.is_system_role
            FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
          `, [user.id]);

          const roles = userRolesResult.rows;

          // 获取权限（所有类型：module, page, function）
          let permissions: any[] = [];
          if (roles.length > 0) {
            const roleIds = roles.map((r: any) => r.id);
            const rolePermissionsResult = await db.query(`
              SELECT 
                p.id, 
                p.name, 
                p.code,
                p.type,
                p.parent_id,
                p.page_path,
                p.description,
                p.sort_order,
                p.is_active,
                p.created_at,
                p.updated_at
              FROM permissions p
              JOIN role_permissions rp ON p.id = rp.permission_id
              WHERE rp.role_id = ANY($1)
                AND p.is_active = true
              ORDER BY p.type, p.sort_order
            `, [roleIds]);

            permissions = rolePermissionsResult.rows;
          }

          if (roles.length === 0) {
            return null; // 用户没有角色，不允许登录
          }

          // 更新最后登录时间
          await db.query(
            'UPDATE users SET last_login_at = $1 WHERE id = $2',
            [new Date().toISOString(), user.id]
          );

          // 返回用户信息（包含角色和权限）
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.username, // NextAuth 需要 name 字段
            roles,
            permissions,
            is_superuser: user.is_superuser,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 首次登录时，将用户信息添加到 token
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.roles = (user as any).roles;
        token.permissions = (user as any).permissions;
        token.is_superuser = (user as any).is_superuser;
      }
      return token;
    },
    async session({ session, token }) {
      // 将 token 中的信息添加到 session
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).roles = token.roles;
        (session.user as any).permissions = token.permissions;
        (session.user as any).is_superuser = token.is_superuser;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt', // 使用 JWT 策略
    maxAge: authConfig.session.maxAge / 1000, // 转换为秒
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: authConfig.session.secure,
      },
    },
  },
});

// 导出 GET 和 POST 处理器
// 按照 NextAuth v5 官方文档的写法：https://next-auth.js.org/getting-started/installation
// NextAuth v5 应该能够自动识别 Next.js 的 basePath，通过 trustHost: true 和 AUTH_URL 配置
// 注意：NextAuth v5 中 NEXTAUTH_URL 已被 AUTH_URL 取代

// 导出 GET 和 POST 处理器
// 注意：在 Next.js 开发模式下，路由在首次访问时需要编译，可能导致偶发的 404 错误
// 这是开发环境的正常行为，不影响功能，生产环境不会出现此问题
// NextAuth 的 handlers 会自动处理这些情况，我们直接导出即可
export const { GET, POST } = handlers;

