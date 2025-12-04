# 鉴权系统重新设计方案

## 当前问题分析

### 1. 混合鉴权系统
- **自定义session鉴权**：使用数据库存储session，手动验证
- **NextAuth.js**：JWT策略，但配置不完整
- **中间件混乱**：同时处理两种鉴权方式

### 2. 权限检查不统一
- **多种权限类型**：module/page/function，但使用方式不一致
- **检查逻辑分散**：在不同API中使用不同的权限检查代码
- **缺乏统一接口**：没有统一的权限验证中间件

### 3. 安全风险
- **密码验证fallback**：存在不安全的密码验证逻辑
- **Session管理不完善**：过期清理、并发控制等缺失
- **权限泄露风险**：前端直接处理权限逻辑

## 新设计方案

### 1. 统一鉴权架构

#### 1.1 采用NextAuth.js作为唯一鉴权方案
```typescript
// 完全移除自定义session，使用NextAuth.js
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Credentials({...})],
  callbacks: {
    // 统一处理用户信息和权限
  }
});
```

#### 1.2 权限数据结构优化
```typescript
interface Permission {
  id: string;
  name: string;
  code: string; // 统一使用code进行权限检查
  type: 'module' | 'page' | 'function';
  resource?: string; // 资源类型
  action?: string;  // 操作类型
  parent_id?: string;
  page_path?: string; // 仅page类型使用
}

interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  is_superuser: boolean;
}
```

### 2. 统一权限检查机制

#### 2.1 服务端权限检查中间件
```typescript
// 高阶函数模式，支持细粒度权限控制
export function withAuth(permission?: string) {
  return async (request: NextRequest) => {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (permission && !hasPermission(session, permission)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return handler(request, session);
  };
}
```

#### 2.2 统一权限检查函数
```typescript
// 统一的权限检查逻辑
export function hasPermission(session: Session, code: string): boolean {
  if (session.user.is_superuser) return true;
  return session.user.permissions.some(p => p.code === code);
}

export function hasPagePermission(session: Session, pagePath: string): boolean {
  if (session.user.is_superuser) return true;
  return session.user.permissions.some(p => 
    p.type === 'page' && p.page_path === pagePath
  );
}

export function hasAnyPermission(session: Session, codes: string[]): boolean {
  if (session.user.is_superuser) return true;
  return codes.some(code => hasPermission(session, code));
}
```

### 3. API路由鉴权标准化

#### 3.1 统一API路由模式
```typescript
// 每个API路由使用统一的鉴权模式
export async function GET(request: NextRequest) {
  const auth = await requireAuth('users.view');
  if (auth.error) {
    return auth.error;
  }
  
  // 业务逻辑
}
```

#### 3.2 权限装饰器模式
```typescript
// 使用装饰器模式简化权限检查
@RequireAuth('users.create')
export async function POST(request: NextRequest) {
  // 自动处理鉴权，无需手动检查
}
```

### 4. 前端权限验证优化

#### 4.1 统一权限Hook
```typescript
// 提供统一的权限检查Hook
export function usePermissions() {
  const { data: session } = useSession();
  
  return {
    hasPermission: (code: string) => hasPermission(session, code),
    hasPagePermission: (path: string) => hasPagePermission(session, path),
    hasAnyPermission: (codes: string[]) => hasAnyPermission(session, codes),
    isSuperuser: session?.user?.is_superuser || false
  };
}
```

#### 4.2 权限组件优化
```typescript
// 简化的权限检查组件
<PermissionGuard code="users.edit">
  <EditButton />
</PermissionGuard>

<PagePermission path="/admin/settings">
  <SettingsPage />
</PagePermission>
```

### 5. 权限数据管理

#### 5.1 权限缓存机制
```typescript
// Redis缓存用户权限，提高性能
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const cacheKey = `user:${userId}:permissions`;
  let permissions = await redis.get(cacheKey);
  
  if (!permissions) {
    permissions = await db.query(/* 查询用户权限 */);
    await redis.setex(cacheKey, 300, JSON.stringify(permissions)); // 5分钟缓存
  }
  
  return JSON.parse(permissions);
}
```

#### 5.2 权限继承机制
```typescript
// 实现权限继承：拥有模块权限自动拥有页面和功能权限
export function checkPermissionWithInheritance(
  userPermissions: Permission[], 
  targetCode: string
): boolean {
  // 直接权限检查
  if (userPermissions.some(p => p.code === targetCode)) {
    return true;
  }
  
  // 继承权限检查
  const targetPermission = allPermissions.find(p => p.code === targetCode);
  if (!targetPermission) return false;
  
  // 检查是否拥有父模块权限
  return checkParentPermission(userPermissions, targetPermission);
}
```

### 6. 安全增强措施

#### 6.1 Session安全
```typescript
// 配置安全的JWT和Cookie选项
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60, // 24小时
  updateAge: 60 * 60,   // 1小时更新一次
},
cookies: {
  sessionToken: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
}
```

#### 6.2 权限审计
```typescript
// 记录权限操作审计日志
export async function logPermissionAccess(
  userId: string, 
  resource: string, 
  action: string, 
  result: boolean
) {
  await db.query(`
    INSERT INTO permission_audit_logs 
    (user_id, resource, action, result, ip_address, user_agent, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [userId, resource, action, result, getClientIP(), getUserAgent()]);
}
```

## 实施计划

### Phase 1: 清理现有系统 (1-2天)
- 移除自定义session相关代码
- 统一使用NextAuth.js
- 清理重复的权限检查逻辑

### Phase 2: 实现统一权限架构 (2-3天)
- 实现新的权限检查中间件
- 创建统一的权限检查函数
- 更新API路由鉴权模式

### Phase 3: 前端权限优化 (1-2天)
- 重构权限Hook和组件
- 统一前端权限验证逻辑
- 优化用户体验

### Phase 4: 安全和性能优化 (1-2天)
- 实现权限缓存机制
- 添加审计日志
- 安全配置优化

### Phase 5: 测试和验证 (1天)
- 全面测试权限功能
- 性能测试
- 安全测试

## 预期收益

1. **安全性提升**：统一的鉴权方案，消除安全隐患
2. **开发效率**：标准化的权限检查模式，减少重复代码
3. **维护性**：清晰的权限架构，易于维护和扩展
4. **性能优化**：权限缓存和查询优化
5. **用户体验**：统一的权限提示和错误处理

## 风险评估

1. **迁移风险**：需要仔细测试，确保权限不丢失
2. **兼容性**：确保现有功能不受影响
3. **性能影响**：新的权限检查机制可能带来性能开销，需要通过缓存优化

## 回滚方案

保留现有代码备份，如果新方案出现问题，可以快速回滚到原有实现。同时提供渐进式迁移方案，可以分模块逐步切换。
