/**
 * NextAuth.js 类型扩展
 * 添加自定义字段到 Session 和 JWT
 */

import 'next-auth';
import { Role, Permission } from './database/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roles: Role[];
      permissions: Permission[];
      is_superuser: boolean;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    name?: string | null;
    roles: Role[];
    permissions: Permission[];
    is_superuser: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    roles: Role[];
    permissions: Permission[];
    is_superuser: boolean;
  }
}

