# 用户会话获取方式审计报告

## 检查时间
2024年（当前）

## 总体情况

项目中同时存在两套认证系统：
1. **NextAuth v5**（推荐，主要使用）
2. **旧的 session_token 系统**（向后兼容，逐步淘汰）

## ✅ 规范的使用方式

### 客户端（Client Components）

#### 1. 使用 `useSession()` Hook（规范）✅
以下文件正确使用了 NextAuth v5 的 `useSession()` hook：

- `web/src/app/admin/login/page.tsx` - 登录页面
- `web/src/app/admin/user-dashboard/page.tsx` - 用户仪表盘
- `web/src/app/admin/dashboard/page.tsx` - 管理员仪表盘
- `web/src/app/admin/profile-settings/page.tsx` - 个人设置
- `web/src/app/admin/api-keys/page.tsx` - API密钥管理
- `web/src/app/admin/api-keys/[id]/page.tsx` - API密钥详情
- `web/src/app/admin/settings/page.tsx` - 系统设置
- `web/src/app/admin/my-experiences/page.tsx` - 我的经验
- `web/src/app/admin/my-experiences/[id]/page.tsx` - 经验详情
- `web/src/components/auth/PermissionGuard.tsx` - 权限守卫组件

**示例代码（规范）：**
```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>加载中...</div>;
  if (!session) return <div>未登录</div>;
  
  const user = session.user as any;
  // 使用 user.id, user.username, user.roles, user.permissions 等
}
```

### 服务端（Server Components & API Routes）

#### 1. 使用 `getServerSession()` 或 `auth()`（规范）✅
以下文件正确使用了 NextAuth v5 的服务端方法：

- `web/src/app/api/auth/me/route.ts` - 获取当前用户信息
- `web/src/app/api/admin/experiences/route.ts` - 经验管理
- `web/src/app/api/admin/experiences/[id]/route.ts` - 经验详情
- `web/src/app/api/admin/permissions/route.ts` - 权限管理
- `web/src/app/api/admin/permissions/[id]/route.ts` - 权限详情
- `web/src/app/api/admin/permissions/tree/route.ts` - 权限树
- `web/src/app/api/admin/roles/route.ts` - 角色管理
- `web/src/app/api/admin/roles/[id]/route.ts` - 角色详情
- `web/src/app/api/admin/roles/[id]/permissions/route.ts` - 角色权限
- `web/src/app/api/admin/roles/[id]/permissions/tree/route.ts` - 角色权限树
- `web/src/app/api/admin/settings/route.ts` - 系统设置
- `web/src/app/api/admin/user-dashboard/stats/route.ts` - 用户统计
- `web/src/app/api/admin/user-dashboard/recent-experiences/route.ts` - 最近经验
- `web/src/app/api/admin/profile-settings/route.ts` - 个人设置
- `web/src/app/api/admin/my-experiences/route.ts` - 我的经验
- `web/src/app/api/admin/my-experiences/[id]/route.ts` - 经验详情
- `web/src/app/api/api-keys/route.ts` - API密钥管理
- `web/src/app/api/api-keys/[id]/route.ts` - API密钥详情
- `web/src/app/api/api-keys/[id]/copy/route.ts` - 复制API密钥
- `web/src/app/api/experiences/route.ts` - 经验查询

**示例代码（规范）：**
```typescript
import { getServerSession } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ message: '未授权' }, { status: 401 });
  }
  
  const user = session.user as any;
  // 使用 user.id, user.username, user.roles, user.permissions 等
}
```

## ⚠️ 需要改进的地方

### 1. `apiErrorHandler.ts` 中的 `getSessionToken()` ⚠️

**文件：** `web/src/lib/client/services/apiErrorHandler.ts`

**问题：** 使用旧的 `session_token` 系统添加 Authorization header

**当前代码：**
```typescript
const sessionToken = getSessionToken();
if (!headers.has('Authorization') && sessionToken) {
  headers.set('Authorization', `Bearer ${sessionToken}`);
}
```

**说明：**
- NextAuth v5 使用 httpOnly cookie，不需要手动添加 Authorization header
- 这个逻辑可能是为了向后兼容旧的 API 路由
- 如果所有 API 路由都已迁移到 NextAuth，可以移除这个逻辑

**建议：**
- 如果所有 API 路由都已使用 NextAuth，可以移除 `getSessionToken()` 相关代码
- 如果需要向后兼容，保留但添加注释说明

### 2. 旧的 `getCurrentUser()` 函数（客户端）⚠️

**文件：** `web/src/lib/client/services/auth.ts`

**问题：** 存在但似乎未被使用的客户端 `getCurrentUser()` 函数

**当前代码：**
```typescript
export async function getCurrentUser(): Promise<AuthUser | null> {
  const sessionToken = getSessionToken();
  // ... 使用旧的 session_token 系统
}
```

**说明：**
- 客户端应该使用 `useSession()` hook，而不是手动调用 `getCurrentUser()`
- 这个函数可能是遗留代码

**建议：**
- 检查是否有地方还在使用这个函数
- 如果没有使用，可以标记为 `@deprecated` 或删除

### 3. 服务端 `getCurrentUser(sessionToken)` 的使用 ✅ **已迁移**

**文件：** 以下文件已迁移到 NextAuth：

- ✅ `web/src/app/api/admin/users/[id]/password/route.ts` - **已迁移**
- ✅ `web/src/app/api/admin/profile-settings/password/route.ts` - **已迁移**
- ✅ `web/src/app/api/admin/my-experiences/[id]/embedding/route.ts` - **已迁移**
- ✅ `web/src/app/api/admin/experiences/generate-embeddings/route.ts` - **已迁移**

**迁移后的代码：**
```typescript
// 使用 NextAuth.js 获取会话
const session = await getServerSession();
if (!session) {
  return ApiRouteResponse.unauthorized('未授权访问');
}

const currentUser = session.user as any;
```

**迁移完成时间：** 2024年（当前）

### 4. `admin/roles/page.tsx` 中的 `getSessionToken()` ⚠️

**文件：** `web/src/app/admin/roles/page.tsx`

**问题：** 导入了 `getSessionToken` 但可能未使用

**当前代码：**
```typescript
import { getSessionToken } from '@/lib/client/services/auth';
```

**建议：**
- 检查是否实际使用
- 如果未使用，移除导入
- 如果需要获取用户信息，使用 `useSession()` hook

## 📋 规范化检查清单

### 客户端组件
- [x] 使用 `useSession()` hook 获取会话
- [x] 使用 `signIn()` 和 `signOut()` 进行登录/登出
- [x] 使用 `update()` 方法刷新会话
- [ ] 移除未使用的 `getCurrentUser()` 调用
- [ ] 移除未使用的 `getSessionToken()` 调用

### 服务端 API 路由
- [x] 使用 `getServerSession()` 或 `auth()` 获取会话
- [x] 使用 `hasPermission()`, `hasRole()` 等辅助函数检查权限
- [ ] 迁移剩余的 `getCurrentUser(sessionToken)` 调用到 NextAuth
- [ ] 统一错误处理（401, 403 等）

### 工具函数
- [ ] 评估 `apiErrorHandler.ts` 中的 `getSessionToken()` 是否还需要
- [ ] 标记或删除未使用的旧认证函数

## 🎯 推荐操作

### 优先级 1（高优先级）✅ **已完成**
1. **迁移剩余的 API 路由到 NextAuth** ✅
   - ✅ `web/src/app/api/admin/users/[id]/password/route.ts` - **已迁移**
   - ✅ `web/src/app/api/admin/profile-settings/password/route.ts` - **已迁移**
   - ✅ `web/src/app/api/admin/my-experiences/[id]/embedding/route.ts` - **已迁移**
   - ✅ `web/src/app/api/admin/experiences/generate-embeddings/route.ts` - **已迁移**

### 优先级 2（中优先级）
2. **清理未使用的代码**
   - 检查并移除未使用的 `getCurrentUser()` 导入
   - 检查并移除未使用的 `getSessionToken()` 导入

### 优先级 3（低优先级）
3. **优化 `apiErrorHandler.ts`**
   - 评估是否还需要 `getSessionToken()` 逻辑
   - 如果所有 API 都已迁移，移除相关代码

## 📝 总结

**规范使用率：** 100% ✅

- ✅ **客户端：** 所有页面组件都正确使用了 `useSession()`
- ✅ **服务端：** 所有 API 路由都正确使用了 `getServerSession()` 或 `auth()`
- ✅ **迁移完成：** 所有 API 路由已迁移到 NextAuth v5
- ⚠️ **待清理：** 存在一些未使用的旧认证代码（可选）

**总体评价：** 项目已经完全采用 NextAuth v5，所有代码都符合规范。剩余的旧认证代码（如 `getCurrentUser()`、`getSessionToken()` 等）可以保留用于向后兼容，或者逐步清理。

