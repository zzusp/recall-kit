# NextAuth.js 设置指南

## 快速开始

### 1. 环境变量配置

在 `web/.env.local` 文件中添加：

```env
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars
NEXTAUTH_URL=http://localhost:3000
```

**生成密钥**:
```bash
openssl rand -base64 32
```

### 2. 已完成的配置

✅ NextAuth.js 已安装并配置
✅ Credentials Provider 已设置
✅ 角色和权限系统已集成
✅ 中间件已更新
✅ 登录页面已更新
✅ SessionProvider 已添加到根布局

### 3. 使用方式

#### 客户端组件
```typescript
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>加载中...</div>;
  if (!session) return <button onClick={() => signIn()}>登录</button>;
  
  return (
    <div>
      <p>欢迎，{session.user.username}</p>
      <button onClick={() => signOut()}>退出</button>
    </div>
  );
}
```

#### 服务端 API 路由
```typescript
import { getServerSession } from '@/lib/server/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = session.user;
  // 使用 user.id, user.roles, user.permissions, user.is_superuser
}
```

#### Server Components
```typescript
import { getServerSession } from '@/lib/server/auth';
import { redirect } from 'next/navigation';

export default async function MyPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }
  
  return <div>欢迎，{session.user.username}</div>;
}
```

### 4. 权限检查

```typescript
import { hasPermission, hasRole, isAdminOrSuperuser } from '@/lib/server/auth';

const session = await getServerSession();
if (session) {
  // 检查权限
  if (hasPermission(session, 'users', 'view')) {
    // 有权限
  }
  
  // 检查角色
  if (hasRole(session, 'admin')) {
    // 是管理员
  }
  
  // 检查是否为管理员或超级用户
  if (isAdminOrSuperuser(session)) {
    // 是管理员或超级用户
  }
}
```

## 迁移检查清单

### 已完成 ✅
- [x] NextAuth.js 安装
- [x] 基础配置
- [x] Credentials Provider
- [x] 中间件更新
- [x] 登录页面更新
- [x] SessionProvider 设置
- [x] 类型定义扩展
- [x] 服务端辅助函数
- [x] `/api/auth/me` 路由更新
- [x] `/api/admin/my-experiences` 路由更新

### 待完成 ⏳
- [ ] 更新其他 API 路由
- [ ] 更新客户端组件
- [ ] 测试所有功能
- [ ] 更新文档

## 测试

### 1. 测试登录
1. 访问 `/admin/login`
2. 输入用户名和密码
3. 应该成功登录并跳转

### 2. 测试会话
1. 登录后访问 `/api/auth/session`
2. 应该返回当前用户信息

### 3. 测试权限
1. 使用不同角色的用户登录
2. 测试权限检查功能

## 故障排除

### 问题: "NEXTAUTH_SECRET is not set"
**解决**: 在 `.env.local` 中添加 `NEXTAUTH_SECRET`

### 问题: "Invalid credentials"
**解决**: 检查用户名和密码是否正确，确保用户有角色

### 问题: Session 不持久
**解决**: 检查 cookie 设置，确保 `httpOnly` 和 `secure` 配置正确

## 更多信息

- [NextAuth.js 文档](https://next-auth.js.org/)
- [NextAuth.js v5 迁移指南](https://authjs.dev/getting-started/migrating-to-v5)

