# 鉴权系统迁移指南

## 概述

本指南详细说明如何将现有的混合鉴权系统迁移到统一的基于NextAuth.js的RBAC权限系统。

## 迁移前后对比

### 旧系统问题
1. **混合鉴权**：同时使用自定义session和NextAuth.js
2. **权限检查分散**：不同地方使用不同的权限检查方式
3. **安全风险**：存在不安全的密码验证fallback
4. **代码重复**：大量重复的权限验证逻辑

### 新系统优势
1. **统一鉴权**：完全基于NextAuth.js
2. **标准化权限**：统一的RBAC权限模型
3. **安全增强**：移除所有不安全操作
4. **开发效率**：标准化的权限检查API

## 迁移步骤

### Step 1: 更新API路由

#### 旧代码示例
```typescript
// 旧的API路由鉴权方式
export async function GET(request: NextRequest) {
  const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!sessionToken) {
    return ApiRouteResponse.unauthorized('未授权访问');
  }
  
  const currentUser = await getCurrentUser(sessionToken);
  if (!currentUser) {
    return ApiRouteResponse.unauthorized('用户未登录');
  }
  
  // 手动权限检查
  if (!currentUser.is_superuser && !hasPermission(currentUser, 'users.view')) {
    return ApiRouteResponse.forbidden('权限不足');
  }
  
  // 业务逻辑...
}
```

#### 新代码示例
```typescript
// 新的API路由鉴权方式
import { withAuth } from '@/lib/server/middleware/rbac';
import { withErrorHandler } from '@/lib/utils/apiResponse';

export const GET = withErrorHandler(
  withAuth('users.view')(async (request: NextRequest) => {
    // 自动处理鉴权，直接编写业务逻辑
    const { searchParams } = new URL(request.url);
    // 业务逻辑...
  })
);
```

### Step 2: 更新前端组件

#### 旧代码示例
```typescript
// 旧的权限检查方式
const { user, checkPermission } = usePermissions();

const hasAccess = user?.is_superuser || checkPermission('users.view');
```

#### 新代码示例
```typescript
// 新的权限检查方式
import { usePermissions } from '@/hooks/usePermissions';

const { hasPermission, isSuperuser } = usePermissions();

const hasAccess = isSuperuser() || hasPermission('users.view');
```

### Step 3: 使用权限守卫组件

#### 旧代码示例
```typescript
// 手动权限检查
{user?.is_superuser || checkPermission('users.edit') ? (
  <EditButton />
) : null}
```

#### 新代码示例
```typescript
// 使用权限守卫组件
import PermissionGuard from '@/components/auth/PermissionGuard';

<PermissionGuard code="users.edit">
  <EditButton />
</PermissionGuard>

// 或使用简化版本
import { SimplePermissionGuard } from '@/components/auth/PermissionGuard';

<SimplePermissionGuard code="users.edit">
  <EditButton />
</SimplePermissionGuard>
```

## 权限代码标准化

### 权限代码命名规范
```
格式：{resource}.{action}

示例：
- users.view        - 查看用户
- users.create      - 创建用户
- users.edit        - 编辑用户
- users.delete      - 删除用户
- roles.view        - 查看角色
- roles.assign_permissions - 分配权限
- admin.dashboard   - 管理仪表板
- settings.view     - 查看设置
- settings.edit     - 编辑设置
```

### 页面权限 vs 功能权限
- **页面权限**：控制用户是否可以访问某个页面路径
- **功能权限**：控制用户是否可以执行某个具体操作

```typescript
// 页面权限
hasPagePermission('/admin/users')

// 功能权限
hasPermission('users.view')
```

## 常用迁移模式

### 1. API路由迁移

```typescript
// 迁移前
export async function GET(request: NextRequest) {
  const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const currentUser = await getCurrentUser(sessionToken);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // 业务逻辑...
}

// 迁移后
export const GET = withAuth()(async (request: NextRequest) => {
  // 业务逻辑...
});

// 带权限的API
export const POST = withErrorHandler(
  withAuth('users.create')(async (request: NextRequest) => {
    // 业务逻辑...
  })
);
```

### 2. 组件权限检查迁移

```typescript
// 迁移前
const { user, checkPermission } = usePermissions();
const canEdit = user?.is_superuser || checkPermission('users.edit');

// 迁移后
const { hasPermission } = usePermissions();
const canEdit = hasPermission('users.edit');
```

### 3. 菜单权限过滤迁移

```typescript
// 迁移前
const filteredItems = items.filter(item => {
  if (!item.permission) return true;
  if (user?.is_superuser) return true;
  return checkPermission(item.permission.code);
});

// 迁移后
const filteredItems = items.filter(item => {
  if (!item.permission) return true;
  if (user?.is_superuser) return true;
  return hasPermission(item.permission);
});
```

## 数据库变更

### 权限表结构优化
现有权限表结构已经支持新的权限模型，无需重大变更：

```sql
-- permissions 表结构
CREATE TABLE permissions (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  code varchar(100),           -- 权限代码，function类型必填
  type varchar(20) NOT NULL,    -- module/page/function
  parent_id uuid,              -- 父权限ID，支持树形结构
  page_path varchar(200),      -- 页面路径，page类型必填
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp,
  updated_at timestamp
);
```

### 权限数据迁移脚本

```sql
-- 更新权限代码为标准格式
UPDATE permissions 
SET code = CASE 
  WHEN name = '查看用户列表' THEN 'users.view'
  WHEN name = '创建用户' THEN 'users.create'
  WHEN name = '编辑用户' THEN 'users.edit'
  WHEN name = '删除用户' THEN 'users.delete'
  -- 添加更多映射...
END
WHERE type = 'function';
```

## 测试策略

### 1. 单元测试
- 测试权限检查函数
- 测试权限守卫组件
- 测试API路由鉴权

### 2. 集成测试
- 测试完整的权限验证流程
- 测试不同角色的权限访问
- 测试权限继承机制

### 3. 回归测试
- 确保现有功能不受影响
- 验证权限升级后的安全性
- 测试边界情况

## 回滚计划

如果迁移过程中出现问题，可以按以下步骤回滚：

1. **代码回滚**：使用Git恢复到迁移前的版本
2. **数据库回滚**：恢复权限数据的备份
3. **配置回滚**：恢复NextAuth.js的旧配置

## 最佳实践

### 1. 渐进式迁移
- 一次迁移一个模块
- 保持新旧系统并存一段时间
- 逐步验证和切换

### 2. 权限最小化原则
- 默认拒绝访问
- 只授予必要的权限
- 定期审查权限分配

### 3. 安全考虑
- 使用HTTPS传输
- 设置合理的会话超时
- 实现权限审计日志

### 4. 性能优化
- 缓存用户权限信息
- 优化权限查询SQL
- 使用权限继承减少检查次数

## 常见问题

### Q: 如何处理权限继承？
A: 新系统支持权限继承，拥有模块权限自动拥有该模块下的所有页面和功能权限。

### Q: 如何实现动态权限？
A: 可以通过数据库动态配置权限，权限检查函数会实时查询最新的权限配置。

### Q: 如何处理权限缓存？
A: 系统会自动缓存用户权限信息，可以在权限变更时清理相关缓存。

### Q: 如何调试权限问题？
A: 使用开发模式下的详细日志，检查用户角色和权限分配情况。

## 总结

通过这次迁移，我们实现了：
1. **统一的鉴权架构**：基于NextAuth.js的标准化解决方案
2. **增强的安全性**：移除安全隐患，实现细粒度权限控制
3. **提升的开发效率**：标准化的权限检查API和组件
4. **更好的可维护性**：清晰的权限模型和代码结构

迁移完成后，系统的安全性和可维护性将得到显著提升。
