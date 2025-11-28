# Next.js 鉴权实现分析报告

## 当前实现概述

项目使用自定义的基于数据库 Session 的鉴权方案，未使用 Next.js 主流的鉴权库（如 NextAuth.js/Auth.js）。

## 当前实现架构

### 1. Session 管理
- 使用数据库存储 session token（`user_sessions` 表）
- Session token 存储在：
  - Cookie: `session_token`（用于中间件和 API）
  - localStorage: `session_token`（用于客户端）

### 2. 中间件实现
- 位置：`web/middleware.ts` → `web/src/lib/middleware/authMiddleware.ts`
- 功能：
  - 为 API 请求添加 Authorization 头
  - 保护 `/admin` 路由（仅检查 cookie 是否存在）

### 3. API 路由鉴权
- 每个 API 路由手动提取和验证 token
- 使用 `getCurrentUser()` 函数验证 session

## 与 Next.js 主流方案的对比

### ❌ 不符合主流实践的问题

#### 1. **未使用 Next.js 推荐的鉴权库**
- **当前**：自定义实现
- **主流方案**：NextAuth.js (Auth.js) v5 或类似方案
- **影响**：缺少标准化、安全性和维护性

#### 2. **中间件只检查 Cookie 存在，不验证有效性**
```typescript:3:36:web/src/lib/middleware/authMiddleware.ts
export async function middleware(req: NextRequest) {
  console.log('Middleware called for:', req.nextUrl.pathname);
  
  // 为API请求添加Authorization头
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const sessionToken = req.cookies.get('session_token')?.value;
    // ... 只检查是否存在，不验证有效性
  }

  // 保护管理员页面路由
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const sessionToken = req.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    // ❌ 没有验证 session 是否有效
  }
}
```
- **问题**：中间件只检查 cookie 是否存在，不验证 session 是否有效或过期
- **风险**：无效或过期的 token 仍可通过中间件检查

#### 3. **客户端同时使用 localStorage 和 Cookie，不一致**
```typescript:21:27:web/src/lib/client/services/auth.ts
export function setSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('session_token', token);
    // 同时设置cookie，让middleware可以读取
    document.cookie = `session_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=strict`;
  }
}
```
- **问题**：双重存储导致数据不一致风险
- **主流方案**：只使用 httpOnly cookie（服务端设置）

#### 4. **未使用 Next.js 15 的 cookies() API**
- **当前**：使用 `request.cookies.get()`
- **Next.js 15 推荐**：使用 `cookies()` 函数（来自 `next/headers`）
- **影响**：不符合 Next.js 15 最佳实践

#### 5. **每个 API 路由重复的鉴权代码**
```typescript
// 每个 API 路由都需要这样写：
const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
if (!sessionToken) {
  return ApiRouteResponse.unauthorized('未授权访问');
}
const currentUser = await getCurrentUser(sessionToken);
if (!currentUser) {
  return ApiRouteResponse.unauthorized('用户未登录');
}
```
- **问题**：代码重复，容易遗漏
- **主流方案**：使用统一的鉴权中间件或 HOC

#### 6. **密码验证有 Fallback 逻辑（不安全）**
```typescript:50:58:web/src/app/api/auth/login/route.ts
// Verify password using bcrypt
let isPasswordValid = false;
try {
  isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
} catch (error) {
  console.error('Password comparison error:', error);
  // Fallback for development/testing - remove in production
  isPasswordValid = credentials.password === user.password_hash;
}
```
- **问题**：fallback 逻辑存在安全风险
- **建议**：移除 fallback，确保所有密码都使用 bcrypt

#### 7. **服务端函数中检查 window 对象**
```typescript:185:205:web/src/lib/server/services/auth.ts
export async function isAuthenticated(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false; // Server-side, cannot access localStorage
  }
  
  const sessionToken = localStorage.getItem('session_token');
  // ...
}
```
- **问题**：服务端函数不应该检查 `window` 对象
- **建议**：分离客户端和服务端逻辑

#### 8. **缺少 Server Components 支持**
- **当前**：没有为 Server Components 提供鉴权方案
- **Next.js 15 推荐**：使用 Server Components + `cookies()` API

#### 9. **中间件中有调试日志**
```typescript:4:9:web/src/lib/middleware/authMiddleware.ts
export async function middleware(req: NextRequest) {
  console.log('Middleware called for:', req.nextUrl.pathname);
  // ...
  console.log('Session token from cookie:', sessionToken ? 'found' : 'not found');
  console.log('Adding Authorization header');
```
- **问题**：生产环境不应有 console.log
- **建议**：使用环境变量控制或移除

## ✅ 符合主流实践的部分

1. **使用数据库 Session 存储**：符合服务器端 session 管理
2. **使用 bcrypt 进行密码哈希**：符合安全实践
3. **Session 过期机制**：有过期时间管理
4. **角色和权限系统**：实现了 RBAC

## 推荐的改进方案

### 方案 1：使用 NextAuth.js (Auth.js) v5（推荐）

**优点**：
- Next.js 官方推荐的鉴权方案
- 标准化、安全性高
- 支持多种认证提供商
- 内置 Session 管理
- 支持 Server Components

**实施步骤**：
1. 安装 `next-auth` 或 `@auth/core`
2. 配置 Credentials Provider
3. 使用 `getServerSession()` 在 Server Components 和 API Routes
4. 使用中间件保护路由

### 方案 2：改进当前实现（渐进式）

如果不想引入新库，可以改进当前实现：

#### 2.1 改进中间件，验证 Session 有效性
```typescript
export async function middleware(req: NextRequest) {
  // 验证 session 是否有效
  const sessionToken = req.cookies.get('session_token')?.value;
  
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (req.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }
    
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    
    // ✅ 验证 session 有效性
    const isValid = await validateSession(sessionToken);
    if (!isValid) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }
  
  // ...
}
```

#### 2.2 使用 Next.js 15 的 cookies() API
```typescript
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  // ...
}
```

#### 2.3 创建统一的鉴权中间件函数
```typescript
// lib/server/middleware/auth.ts
export async function requireAuth(request: NextRequest) {
  const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '') ||
                      request.cookies.get('session_token')?.value;
  
  if (!sessionToken) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  const user = await getCurrentUser(sessionToken);
  if (!user) {
    return { error: 'Invalid session', status: 401 };
  }
  
  return { user };
}

// 在 API 路由中使用
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return ApiRouteResponse.unauthorized(auth.error);
  }
  const user = auth.user;
  // ...
}
```

#### 2.4 移除 localStorage，只使用 Cookie
- 服务端设置 httpOnly cookie
- 客户端不存储 token
- 所有请求自动携带 cookie

#### 2.5 移除密码验证的 Fallback
```typescript
// 移除 fallback，确保安全
const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
if (!isPasswordValid) {
  return ApiRouteResponse.error('INVALID_CREDENTIALS', '用户名或密码错误', undefined, 401);
}
```

#### 2.6 分离客户端和服务端逻辑
- 服务端函数不应检查 `window` 对象
- 创建独立的客户端和服务端模块

## 优先级建议

### 高优先级（安全相关）
1. ✅ 移除密码验证的 fallback 逻辑
2. ✅ 改进中间件，验证 session 有效性
3. ✅ 移除生产环境的 console.log

### 中优先级（代码质量）
4. ✅ 创建统一的鉴权中间件函数
5. ✅ 使用 Next.js 15 的 cookies() API
6. ✅ 分离客户端和服务端逻辑

### 低优先级（架构改进）
7. ⚠️ 考虑迁移到 NextAuth.js
8. ⚠️ 移除 localStorage，只使用 httpOnly cookie

## 总结

当前实现**基本可用**，但**不符合 Next.js 主流鉴权方案**。主要问题：

1. ❌ 未使用 Next.js 推荐的鉴权库（NextAuth.js）
2. ❌ 中间件不验证 session 有效性
3. ❌ 客户端双重存储导致不一致
4. ❌ 代码重复，缺少统一鉴权中间件
5. ❌ 存在安全风险（密码验证 fallback）

**建议**：
- **短期**：修复安全问题，改进中间件验证
- **长期**：考虑迁移到 NextAuth.js 或类似标准化方案

