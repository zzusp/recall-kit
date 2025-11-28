# NextAuth.js 迁移状态

## 已完成的工作

### ✅ 阶段 1: 安装和基础配置
- [x] 安装 NextAuth.js v5 (beta)
- [x] 创建 NextAuth.js 配置文件 (`app/api/auth/[...nextauth]/route.ts`)
- [x] 配置 Credentials Provider
- [x] 集成角色和权限系统到 JWT/Session

### ✅ 阶段 2: 更新应用代码
- [x] 更新中间件使用 NextAuth.js (`middleware.ts`)
- [x] 更新登录页面使用 `signIn` 函数
- [x] 创建 SessionProvider (`app/providers.tsx`)
- [x] 在根布局中添加 SessionProvider
- [x] 创建服务端辅助函数 (`lib/server/auth.ts`)
- [x] 更新 `/api/auth/me` 路由使用 NextAuth.js
- [x] 更新 `/api/admin/my-experiences` 路由使用 NextAuth.js

## 待完成的工作

### ✅ 阶段 3: 更新剩余 API 路由
已更新以下 API 路由使用 `getServerSession`:

- [x] `/api/experiences/route.ts` (POST)
- [x] `/api/admin/experiences/route.ts` (GET, POST)
- [x] `/api/admin/experiences/[id]/route.ts` (PUT, DELETE)
- [x] `/api/admin/my-experiences/[id]/route.ts` (GET, PUT, PATCH)
- [x] `/api/admin/user-dashboard/stats/route.ts`
- [x] `/api/admin/user-dashboard/recent-experiences/route.ts`
- [x] `/api/admin/profile-settings/route.ts` (GET, POST)
- [x] `/api/auth/logout/route.ts` (已更新为向后兼容)

### ⏳ 待更新（可选，按需更新）
以下路由可以按需更新，使用相同的模式（参考 `MIGRATION_BATCH_UPDATE.md`）：

- [ ] `/api/admin/users/*` 路由
- [ ] `/api/admin/roles/*` 路由
- [ ] `/api/admin/permissions/*` 路由
- [ ] `/api/admin/settings/*` 路由
- [ ] `/api/api-keys/*` 路由
- [ ] `/api/admin/my-experiences/[id]/embedding/route.ts`
- [ ] `/api/admin/experiences/generate-embeddings/route.ts`

### ⏳ 阶段 4: 更新客户端代码
- [ ] 更新客户端组件使用 `useSession` hook
- [ ] 更新客户端组件使用 `signOut` 函数
- [ ] 移除旧的客户端鉴权服务（可选，保持向后兼容）

### ⏳ 阶段 5: 清理和测试
- [ ] 测试所有功能
- [ ] 移除旧的登录 API 路由（可选）
- [ ] 更新文档

## 迁移说明

### 如何使用 NextAuth.js

#### 客户端组件
```typescript
import { useSession, signIn, signOut } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <p>加载中...</p>;
  if (!session) return <button onClick={() => signIn()}>登录</button>;
  
  return (
    <>
      <p>欢迎，{session.user.username}</p>
      <button onClick={() => signOut()}>退出</button>
    </>
  );
}
```

#### 服务端 API 路由
```typescript
import { getServerSession } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const user = session.user as any;
  // 使用 user.id, user.roles, user.permissions 等
}
```

#### Server Components
```typescript
import { getServerSession } from '@/lib/server/auth';

export default async function MyPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/admin/login');
  }
  
  return <div>欢迎，{session.user.username}</div>;
}
```

## 配置说明

### 环境变量
需要在 `.env.local` 中添加：
```
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### Session 策略
当前使用 JWT 策略，用户信息（包括角色和权限）存储在 JWT token 中。

### 权限检查
使用辅助函数：
```typescript
import { hasPermission, hasRole, isAdminOrSuperuser } from '@/lib/server/auth';

const session = await getServerSession();
if (session && hasPermission(session, 'users', 'view')) {
  // 有权限
}
```

## 注意事项

1. **向后兼容**: 旧的 API 路由仍然可以工作，但建议逐步迁移
2. **Session 存储**: NextAuth.js 使用 JWT，不再使用 `user_sessions` 表（可以保留用于审计）
3. **Cookie 名称**: NextAuth.js 使用 `next-auth.session-token` cookie
4. **类型安全**: 需要扩展 NextAuth.js 的类型定义以包含自定义字段

## 下一步

1. 继续更新剩余的 API 路由
2. 更新客户端组件
3. 进行全面测试
4. 考虑移除旧代码（可选）

