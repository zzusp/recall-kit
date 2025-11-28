import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/server/db/client';
import bcrypt from 'bcryptjs';
import { authConfig } from '@/config/auth';

/**
 * NextAuth.js 配置
 * 使用 Credentials Provider 适配现有的数据库用户系统
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authConfig.secret,
  trustHost: true,
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

          // 获取权限
          let permissions: any[] = [];
          if (roles.length > 0) {
            const roleIds = roles.map((r: any) => r.id);
            const rolePermissionsResult = await db.query(`
              SELECT p.id, p.name, p.resource, p.action, p.description
              FROM permissions p
              JOIN role_permissions rp ON p.id = rp.permission_id
              WHERE rp.role_id = ANY($1)
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
export const { GET, POST } = handlers;

