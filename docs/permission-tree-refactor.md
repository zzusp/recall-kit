# 权限系统树形结构改造开发文档

## 1. 需求概述

### 1.1 背景
当前权限系统使用扁平的 `resource + action` 结构，权限信息不够直观，用户难以从权限信息分辨出对应哪个页面的哪个功能。

### 1.2 目标
将权限系统改造为树形结构，使权限管理更加直观和易于理解。

### 1.3 预期效果
- 权限以树形结构展示：模块 → 页面 → 功能
- 权限信息包含页面路径、模块名称、功能名称等直观信息
- 支持按模块/页面分组查看和管理权限
- 在角色分配权限时，可以按树形结构选择

## 2. 数据库设计

### 2.1 权限表结构变更

#### 当前结构
```sql
CREATE TABLE permissions (
    id uuid PRIMARY KEY,
    name varchar(100) NOT NULL,
    resource varchar(50) NOT NULL,
    action varchar(50) NOT NULL,
    description text,
    created_at timestamp,
    updated_at timestamp
);
```

#### 新结构（树形）
```sql
CREATE TABLE permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name varchar(100) NOT NULL,                    -- 权限显示名称（模块/页面/功能的名称）
    code varchar(100) UNIQUE,                      -- 权限代码（如：users.view，function类型必填，用于权限检查）
    type varchar(20) NOT NULL,                     -- 权限类型：module/page/function
    parent_id uuid REFERENCES permissions(id) ON DELETE CASCADE,  -- 父权限ID，NULL表示根节点
    page_path varchar(200),                        -- 页面路径（page类型必填，如：/admin/users）
    description text,                              -- 权限描述
    sort_order integer DEFAULT 0,                 -- 排序顺序
    is_active boolean DEFAULT true,                -- 是否启用
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 添加表注释
COMMENT ON TABLE permissions IS '权限表，采用树形结构存储权限信息，支持模块-页面-功能三级结构';

-- 添加列注释
COMMENT ON COLUMN permissions.id IS '权限主键ID';
COMMENT ON COLUMN permissions.name IS '权限显示名称，根据type不同含义不同：module=模块名，page=页面名，function=功能名';
COMMENT ON COLUMN permissions.code IS '权限代码，function类型必填且唯一，用于权限检查，格式如：users.view';
COMMENT ON COLUMN permissions.type IS '权限类型：module（模块）、page（页面）、function（功能）';
COMMENT ON COLUMN permissions.parent_id IS '父权限ID，用于构建树形结构，NULL表示根节点';
COMMENT ON COLUMN permissions.page_path IS '页面路径，page类型必填，用于路由权限检查，如：/admin/users';
COMMENT ON COLUMN permissions.description IS '权限描述信息';
COMMENT ON COLUMN permissions.sort_order IS '排序顺序，用于控制权限在树中的显示顺序';
COMMENT ON COLUMN permissions.is_active IS '是否启用，false表示该权限已被禁用';
COMMENT ON COLUMN permissions.created_at IS '创建时间';
COMMENT ON COLUMN permissions.updated_at IS '更新时间';

-- 添加索引
CREATE INDEX idx_permissions_parent_id ON permissions(parent_id);
CREATE INDEX idx_permissions_type ON permissions(type);
CREATE INDEX idx_permissions_code ON permissions(code) WHERE code IS NOT NULL;
CREATE INDEX idx_permissions_page_path ON permissions(page_path) WHERE page_path IS NOT NULL;
```

#### 字段说明

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | uuid | 是 | 主键 | - |
| `name` | varchar(100) | 是 | 权限显示名称（根据type不同含义不同） | module: "系统管理"<br>page: "用户管理"<br>function: "查看用户列表" |
| `code` | varchar(100) | 条件 | 权限代码（function类型必填，唯一） | "users.view" |
| `type` | varchar(20) | 是 | 权限类型 | "module"/"page"/"function" |
| `parent_id` | uuid | 否 | 父权限ID，NULL表示根节点 | 指向父权限的ID |
| `page_path` | varchar(200) | 条件 | 页面路径（page类型必填） | "/admin/users" |
| `description` | text | 否 | 权限描述 | "允许查看用户列表" |
| `sort_order` | integer | 否 | 排序顺序 | 0, 1, 2... |
| `is_active` | boolean | 否 | 是否启用 | true/false |

### 2.2 权限类型说明

#### type = 'module'（模块）
- 权限树的根节点或一级节点
- 例如：系统管理、内容管理
- `parent_id` 为 NULL 或指向另一个模块
- `name` 字段存储模块名称（如："系统管理"）
- `code` 字段可选，用于标识模块（如："system"）
- **可以分配给角色**：如果用户拥有某个 module 权限，可以访问该模块下的所有页面（但具体操作需要对应的 function 权限）

#### type = 'page'（页面）
- 权限树的二级节点
- 例如：用户管理、角色管理
- `parent_id` 指向模块节点
- `name` 字段存储页面名称（如："用户管理"）
- 必须包含 `page_path`（如："/admin/users"）
- `code` 字段可选，用于标识页面（如："users.page"）
- **可以分配给角色**：如果用户拥有某个 page 权限，可以访问该页面（路由权限检查），但具体操作需要对应的 function 权限

#### type = 'function'（功能）
- 权限树的叶子节点，实际用于功能权限检查的节点
- 例如：查看用户列表、创建用户、编辑用户
- `parent_id` 指向页面节点
- `name` 字段存储功能名称（如："查看用户列表"）
- 必须包含 `code`（用于权限检查，唯一标识，如："users.view"）
- **可以分配给角色**：如果用户拥有某个 function 权限，可以执行对应的功能操作

### 2.3 权限树示例结构

```
系统管理 (module)
├── 管理仪表板 (page, /admin/dashboard)
│   └── 查看仪表板 (function, admin.dashboard)
├── 用户管理 (page, /admin/users)
│   ├── 查看用户列表 (function, users.view)
│   ├── 查看用户详情 (function, users.view_detail)
│   ├── 创建用户 (function, users.create)
│   ├── 编辑用户 (function, users.edit)
│   ├── 删除用户 (function, users.delete)
│   ├── 激活/禁用用户 (function, users.toggle_active)
│   └── 重置密码 (function, users.reset_password)
├── 角色管理 (page, /admin/roles)
│   ├── 查看角色列表 (function, roles.view)
│   ├── 查看角色详情 (function, roles.view_detail)
│   ├── 创建角色 (function, roles.create)
│   ├── 编辑角色 (function, roles.edit)
│   ├── 删除角色 (function, roles.delete)
│   └── 分配权限 (function, roles.assign_permissions)
├── 权限管理 (page, /admin/permissions)
│   ├── 查看权限列表 (function, permissions.view)
│   ├── 查看权限详情 (function, permissions.view_detail)
│   ├── 创建权限 (function, permissions.create)
│   ├── 编辑权限 (function, permissions.edit)
│   ├── 删除权限 (function, permissions.delete)
│   └── 移动权限 (function, permissions.move)
├── 经验管理 (page, /admin/experiences)
│   ├── 查看经验列表 (function, experiences.view)
│   ├── 创建经验 (function, experiences.create)
│   ├── 编辑经验 (function, experiences.edit)
│   ├── 删除经验 (function, experiences.delete)
│   └── 批量生成向量化数据 (function, experiences.batch_generate_embedding)
└── 系统设置 (page, /admin/settings)
    ├── 查看系统设置 (function, admin.settings.view)
    └── 编辑系统设置 (function, admin.settings.edit)
```

### 2.4 数据初始化方案

#### 步骤1：重建表结构
```sql
-- 1. 删除旧表（会级联删除关联数据）
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- 2. 创建新的权限表结构（使用上面的新结构定义）
-- 注意：需要先执行完整的 CREATE TABLE 语句

-- 3. 重新创建 role_permissions 表
CREATE TABLE role_permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

-- 添加表注释
COMMENT ON TABLE role_permissions IS '角色权限关联表，用于存储角色与权限的多对多关系';

-- 添加列注释
COMMENT ON COLUMN role_permissions.id IS '关联关系主键ID';
COMMENT ON COLUMN role_permissions.role_id IS '角色ID，外键关联roles表';
COMMENT ON COLUMN role_permissions.permission_id IS '权限ID，外键关联permissions表，支持所有类型的权限（module/page/function）';
COMMENT ON COLUMN role_permissions.created_at IS '创建时间';

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
```

#### 步骤2：初始化权限树数据
```sql
-- 1. 创建模块节点
DO $$
DECLARE
  module_id uuid;
BEGIN
  INSERT INTO permissions (name, code, type, sort_order, created_at, updated_at)
  VALUES ('系统管理', 'system', 'module', 1, NOW(), NOW())
  RETURNING id INTO module_id;

  -- 2. 创建页面节点
  INSERT INTO permissions (name, code, type, parent_id, page_path, sort_order, created_at, updated_at)
  VALUES 
    ('管理仪表板', 'admin.dashboard.page', 'page', module_id, '/admin/dashboard', 1, NOW(), NOW()),
    ('用户管理', 'users.page', 'page', module_id, '/admin/users', 2, NOW(), NOW()),
    ('角色管理', 'roles.page', 'page', module_id, '/admin/roles', 3, NOW(), NOW()),
    ('权限管理', 'permissions.page', 'page', module_id, '/admin/permissions', 4, NOW(), NOW()),
    ('经验管理', 'experiences.page', 'page', module_id, '/admin/experiences', 5, NOW(), NOW()),
    ('系统设置', 'settings.page', 'page', module_id, '/admin/settings', 6, NOW(), NOW());

  -- 3. 创建功能节点
  -- 管理仪表板
  INSERT INTO permissions (name, code, type, parent_id, description, sort_order, created_at, updated_at)
  SELECT 
    '查看仪表板', 
    'admin.dashboard', 
    'function', 
    id, 
    '允许查看管理仪表板', 
    1, 
    NOW(), 
    NOW()
  FROM permissions WHERE code = 'admin.dashboard.page';

  -- 用户管理
  INSERT INTO permissions (name, code, type, parent_id, description, sort_order, created_at, updated_at)
  SELECT 
    v.name, 
    v.code, 
    'function', 
    (SELECT id FROM permissions WHERE code = 'users.page'), 
    v.description, 
    v.sort_order, 
    NOW(), 
    NOW()
  FROM (VALUES
    ('查看用户列表', 'users.view', '允许查看用户列表', 1),
    ('查看用户详情', 'users.view_detail', '允许查看用户详情', 2),
    ('创建用户', 'users.create', '允许创建新用户', 3),
    ('编辑用户', 'users.edit', '允许编辑用户信息', 4),
    ('删除用户', 'users.delete', '允许删除用户', 5),
    ('激活/禁用用户', 'users.toggle_active', '允许激活或禁用用户', 6),
    ('重置密码', 'users.reset_password', '允许重置用户密码', 7)
  ) AS v(name, code, description, sort_order);

  -- 角色管理
  INSERT INTO permissions (name, code, type, parent_id, description, sort_order, created_at, updated_at)
  SELECT 
    v.name, 
    v.code, 
    'function', 
    (SELECT id FROM permissions WHERE code = 'roles.page'), 
    v.description, 
    v.sort_order, 
    NOW(), 
    NOW()
  FROM (VALUES
    ('查看角色列表', 'roles.view', '允许查看角色列表', 1),
    ('查看角色详情', 'roles.view_detail', '允许查看角色详情', 2),
    ('创建角色', 'roles.create', '允许创建新角色', 3),
    ('编辑角色', 'roles.edit', '允许编辑角色信息', 4),
    ('删除角色', 'roles.delete', '允许删除角色', 5),
    ('分配权限', 'roles.assign_permissions', '允许为角色分配权限', 6)
  ) AS v(name, code, description, sort_order);

  -- 权限管理
  INSERT INTO permissions (name, code, type, parent_id, description, sort_order, created_at, updated_at)
  SELECT 
    v.name, 
    v.code, 
    'function', 
    (SELECT id FROM permissions WHERE code = 'permissions.page'), 
    v.description, 
    v.sort_order, 
    NOW(), 
    NOW()
  FROM (VALUES
    ('查看权限列表', 'permissions.view', '允许查看权限列表', 1),
    ('查看权限详情', 'permissions.view_detail', '允许查看权限详情', 2),
    ('创建权限', 'permissions.create', '允许创建新权限', 3),
    ('编辑权限', 'permissions.edit', '允许编辑权限信息', 4),
    ('删除权限', 'permissions.delete', '允许删除权限', 5),
    ('移动权限', 'permissions.move', '允许移动权限在树中的位置', 6)
  ) AS v(name, code, description, sort_order);

  -- 经验管理
  INSERT INTO permissions (name, code, type, parent_id, description, sort_order, created_at, updated_at)
  SELECT 
    v.name, 
    v.code, 
    'function', 
    (SELECT id FROM permissions WHERE code = 'experiences.page'), 
    v.description, 
    v.sort_order, 
    NOW(), 
    NOW()
  FROM (VALUES
    ('查看经验列表', 'experiences.view', '允许查看所有用户的经验列表', 1),
    ('创建经验', 'experiences.create', '允许创建经验', 2),
    ('编辑经验', 'experiences.edit', '允许编辑任何用户的经验', 3),
    ('删除经验', 'experiences.delete', '允许删除任何用户的经验', 4),
    ('批量生成向量化数据', 'experiences.batch_generate_embedding', '允许批量生成经验的向量化数据', 5)
  ) AS v(name, code, description, sort_order);

  -- 系统设置
  INSERT INTO permissions (name, code, type, parent_id, description, sort_order, created_at, updated_at)
  SELECT 
    v.name, 
    v.code, 
    'function', 
    (SELECT id FROM permissions WHERE code = 'settings.page'), 
    v.description, 
    v.sort_order, 
    NOW(), 
    NOW()
  FROM (VALUES
    ('查看系统设置', 'admin.settings.view', '允许查看系统设置', 1),
    ('编辑系统设置', 'admin.settings.edit', '允许编辑系统设置', 2)
  ) AS v(name, code, description, sort_order);

END $$;
```

#### 步骤3：数据验证
```sql
-- 验证数据完整性
-- 1. 检查是否有孤立节点
SELECT * FROM permissions WHERE parent_id IS NOT NULL 
AND parent_id NOT IN (SELECT id FROM permissions);

-- 2. 检查是否有重复code（function类型）
SELECT code, COUNT(*) FROM permissions 
WHERE type = 'function' AND code IS NOT NULL
GROUP BY code HAVING COUNT(*) > 1;

-- 3. 检查所有function类型权限是否都有code
SELECT * FROM permissions 
WHERE type = 'function' AND (code IS NULL OR code = '');

-- 4. 检查所有page类型权限是否都有page_path
SELECT * FROM permissions 
WHERE type = 'page' AND page_path IS NULL;

-- 5. 验证权限树结构
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN code IS NOT NULL THEN 1 END) as with_code
FROM permissions
GROUP BY type;
```

## 3. API 设计

### 3.1 权限管理 API

#### 3.1.1 获取权限树
```
GET /api/admin/permissions/tree
```

**响应示例：**
```json
{
  "tree": [
    {
      "id": "uuid",
      "name": "系统管理",
      "code": "system",
      "type": "module",
      "children": [
        {
          "id": "uuid",
          "name": "用户管理",
          "code": "users.page",
          "type": "page",
          "page_path": "/admin/users",
          "children": [
            {
              "id": "uuid",
              "name": "查看用户列表",
              "code": "users.view",
              "type": "function",
              "description": "允许查看用户列表"
            }
          ]
        }
      ]
    }
  ]
}
```

#### 3.1.2 创建权限
```
POST /api/admin/permissions
```

**请求体：**
```json
{
   "name": "查看用户列表",
   "code": "users.view",
   "type": "function",
   "parent_id": "parent-uuid",
   "description": "允许查看用户列表",
   "sort_order": 1
}
```

**验证规则：**
- `type = 'function'` 时：
  - `code` 字段必填且必须唯一
  - `parent_id` 必须指向 `type = 'page'` 的权限
- `type = 'page'` 时：
  - `page_path` 字段必填
  - `parent_id` 必须指向 `type = 'module'` 的权限
  - `code` 字段可选
- `type = 'module'` 时：
  - `parent_id` 应为 NULL 或指向另一个 `type = 'module'` 的权限
  - `code` 字段可选

#### 3.1.3 更新权限
```
PUT /api/admin/permissions/:id
```

**请求体：** 同创建权限，但 `id` 通过路径参数传递

**验证规则：** 同创建权限

#### 3.1.4 删除权限
```
DELETE /api/admin/permissions/:id
```

**限制：**
- 如果权限有子节点，不能删除（需要在应用层检查，防止误删整个子树）
- 如果权限已分配给角色，不能删除（或提示确认后删除，会级联删除角色权限关联）

#### 3.1.5 移动权限（调整树结构）
```
PATCH /api/admin/permissions/:id/move
```

**请求体：**
```json
{
  "parent_id": "new-parent-uuid",
  "sort_order": 2
}
```

**验证规则：**
- 不能移动到自己或自己的子节点下（防止循环引用）
- `type = 'function'` 的权限只能移动到 `type = 'page'` 的权限下
- `type = 'page'` 的权限只能移动到 `type = 'module'` 的权限下
- `type = 'module'` 的权限只能移动到 `NULL` 或其他 `type = 'module'` 的权限下
- 如果移动会破坏树结构（如将 function 移动到 module），应返回错误

### 3.2 角色权限分配 API

#### 3.2.1 获取角色的权限树（带选中状态）
```
GET /api/admin/roles/:id/permissions/tree
```

**响应示例：**
```json
{
  "tree": [
    {
      "id": "uuid",
      "name": "系统管理",
      "type": "module",
      "checked": false,
      "indeterminate": true,  // 部分选中
      "children": [
        {
          "id": "uuid",
          "name": "用户管理",
          "type": "page",
          "checked": false,
          "indeterminate": true,
          "children": [
            {
              "id": "uuid",
              "name": "查看用户列表",
              "type": "function",
              "checked": true
            }
          ]
        }
      ]
    }
  ]
}
```

#### 3.2.2 批量分配权限
```
PUT /api/admin/roles/:id/permissions
```

**请求体：**
```json
{
  "permission_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**说明：**
- 可以分配所有类型的权限（module、page、function）
- 会自动清理该角色之前的权限分配，然后分配新的权限
- 权限的层级关系：
  - 如果分配了 `module` 权限，用户可以获得该模块的访问权限
  - 如果分配了 `page` 权限，用户可以获得该页面的访问权限（路由权限）
  - 如果分配了 `function` 权限，用户可以获得该功能的操作权限

## 4. 前端界面设计

### 4.1 权限管理页面

#### 4.1.1 树形列表展示
- 使用树形组件展示权限结构
- 支持展开/折叠
- 显示权限类型图标（模块/页面/功能）
- 显示权限详细信息（路径、代码等）

#### 4.1.2 权限操作
- 创建权限：选择父节点（模块/页面），填写权限信息
- 编辑权限：修改权限信息，可调整父节点
- 删除权限：检查是否有子节点或已分配
- 移动权限：拖拽调整树结构

#### 4.1.3 筛选和搜索
- 按模块筛选
- 按页面筛选
- 按权限类型筛选
- 关键词搜索

### 4.2 角色管理页面

#### 4.2.1 权限分配界面
- 树形结构展示所有权限
- 支持复选框选择（支持全选/半选状态）
- 支持按模块/页面批量选择
- 显示已分配的权限

#### 4.2.2 权限预览
- 显示已选权限的详细信息
- 显示权限对应的页面路径

### 4.3 组件设计

#### 4.3.1 PermissionTree 组件
```typescript
interface PermissionTreeNode {
  id: string;
  name: string;  // 根据type不同：module=模块名，page=页面名，function=功能名
  code?: string;  // function类型必填，module和page类型可选
  type: 'module' | 'page' | 'function';
  parent_id?: string;
  page_path?: string;  // page类型必填
  description?: string;
  sort_order?: number;
  is_active?: boolean;
  children?: PermissionTreeNode[];
  checked?: boolean;  // 用于角色权限分配时的选中状态
  indeterminate?: boolean;  // 用于角色权限分配时的半选状态
}

interface PermissionTreeProps {
  data: PermissionTreeNode[];
  onSelect?: (node: PermissionTreeNode) => void;
  onCheck?: (node: PermissionTreeNode, checked: boolean) => void;
  showCheckbox?: boolean;  // 是否显示复选框（用于角色权限分配）
  expandAll?: boolean;  // 是否默认展开所有节点
  readonly?: boolean;  // 是否只读模式
}
```

#### 4.3.2 PermissionGuard 组件更新
```typescript
// 更新后的 PermissionGuard 使用方式
<PermissionGuard code="users.view">
  <UsersManagementContent />
</PermissionGuard>

// 或者提供辅助函数支持旧的调用方式
<PermissionGuard resource="users" action="view">
  <UsersManagementContent />
</PermissionGuard>
```

## 5. 权限检查逻辑调整

### 5.1 权限检查逻辑

#### 5.1.1 功能权限检查（function 类型）

功能权限检查使用 `code` 字段，不再使用 `resource + action`：

```typescript
// 检查用户是否有某个功能权限（function 类型）
function hasPermission(user: AuthUser, code: string): boolean {
  if (user.is_superuser) {
    return true;
  }
  
  // 检查用户是否有该权限代码（function 类型）
  return user.permissions.some(
    p => p.type === 'function' && p.code === code && p.is_active
  );
}

// 如果需要兼容旧的 resource.action 调用方式，可以提供辅助函数
function hasPermissionByResourceAction(user: AuthUser, resource: string, action: string): boolean {
  const code = `${resource}.${action}`;
  return hasPermission(user, code);
}
```

#### 5.1.2 页面权限检查（page 类型）

页面权限检查使用 `page_path` 字段：

```typescript
// 检查用户是否有某个页面权限（page 类型）
function hasPagePermission(user: AuthUser, pagePath: string): boolean {
  if (user.is_superuser) {
    return true;
  }
  
  // 直接检查是否有对应的 page 权限
  return user.permissions.some(
    p => p.type === 'page' && p.page_path === pagePath && p.is_active
  );
}
```

#### 5.1.3 模块权限检查（module 类型）

模块权限检查使用 `code` 或 `name` 字段：

```typescript
// 检查用户是否有某个模块权限（module 类型）
function hasModulePermission(user: AuthUser, moduleCode: string): boolean {
  if (user.is_superuser) {
    return true;
  }
  
  // 检查是否有对应的 module 权限
  return user.permissions.some(
    p => p.type === 'module' && p.code === moduleCode && p.is_active
  );
}
```

### 5.2 权限数据加载和存储

#### 5.2.1 权限信息存储

**是的，鉴权后记录的用户信息中会存储权限信息。**

在用户登录或获取用户信息时，系统会：
1. 从数据库查询用户通过角色分配的所有权限（包括 module、page、function 类型）
2. 将所有类型的权限信息存储在用户会话中（Session/JWT）
3. 权限信息包含完整的树结构信息（id、name、code、type、parent_id、page_path 等）

#### 5.2.2 权限信息存储位置

权限信息会存储在以下位置：

1. **Session（NextAuth.js）**：
   - 存储在 `session.user.permissions` 中
   - 每次请求时可以从 session 中获取

2. **JWT Token（可选）**：
   - 如果使用 JWT 策略，权限信息也会编码在 JWT 中
   - 注意：JWT 大小限制，如果权限数量很多，建议只存储权限 code 列表

3. **客户端状态**：
   - 通过 `useSession()` hook 可以访问权限信息
   - 存储在客户端内存中，不持久化

#### 5.2.3 权限信息数据结构

```typescript
// 用户权限数据结构
interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: Permission[]; // 包含完整的权限树结构（function + page + module）
  is_superuser: boolean;
}

// Permission 接口（包含完整的权限树结构）
interface Permission {
  id: string;
  name: string;           // 权限名称（根据 type 不同：module/page/function）
  code?: string;          // 权限代码（function 类型必填，如："users.view"）
  type: 'module' | 'page' | 'function';
  parent_id?: string;     // 父权限ID（用于构建树结构）
  page_path?: string;     // 页面路径（page 类型必填，如："/admin/users"）
  description?: string;   // 权限描述
  is_active: boolean;     // 是否启用
}
```

#### 5.2.4 权限信息查询逻辑

**设计说明：所有类型的权限都可以分配给角色**

由于所有类型的权限（module、page、function）都可以分配给角色，权限查询逻辑变得非常简单：

```typescript
// 服务端：获取用户权限信息（直接查询所有类型的权限）
export async function getCurrentUser(sessionToken: string): Promise<AuthUser | null> {
  // ... 验证 session ...
  
  // 获取用户角色
  const roles = await getUserRoles(userId);
  
  // 直接查询用户拥有的所有权限（包括 module、page、function）
  const permissions = await db.query(`
    SELECT 
      p.id,
      p.name,
      p.code,
      p.type,
      p.parent_id,
      p.page_path,      -- page 类型必填，用于路由权限检查
      p.description,
      p.is_active
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ANY($1)
      AND p.is_active = true
    ORDER BY p.type, p.sort_order;  -- 按类型和排序顺序排序
  `, [roleIds]);
  
  return {
    // ... 其他用户信息
    permissions: permissions.rows  // 包含所有类型的权限
  };
}
```

**权限层级关系说明：**

1. **module 权限**：
   - 如果用户拥有某个 module 权限，可以访问该模块下的所有页面
   - 但具体操作仍需要对应的 function 权限
   - 例如：拥有"系统管理"模块权限，可以访问该模块下的所有页面

2. **page 权限**：
   - 如果用户拥有某个 page 权限，可以访问该页面（路由权限检查）
   - 但具体操作仍需要对应的 function 权限
   - 例如：拥有"用户管理"页面权限，可以访问 `/admin/users` 页面

3. **function 权限**：
   - 如果用户拥有某个 function 权限，可以执行对应的功能操作
   - 例如：拥有 `users.view` 权限，可以查看用户列表

**权限继承关系（可选实现）：**

如果需要实现权限继承（拥有父节点权限就自动拥有子节点权限），可以使用递归 CTE：

```typescript
// 使用递归 CTE 实现权限继承（可选）
const permissions = await db.query(`
  WITH RECURSIVE user_permissions AS (
    -- 基础查询：用户直接分配的权限
    SELECT 
      p.id,
      p.name,
      p.code,
      p.type,
      p.parent_id,
      p.page_path,
      p.description,
      p.is_active,
      0 as level,
      true as direct_assigned  -- 标记为直接分配
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ANY($1)
      AND p.is_active = true
    
    UNION ALL
    
    -- 递归查询：查找子节点（如果拥有父节点权限，自动拥有子节点权限）
    SELECT 
      p.id,
      p.name,
      p.code,
      p.type,
      p.parent_id,
      p.page_path,
      p.description,
      p.is_active,
      up.level + 1,
      false as direct_assigned  -- 标记为继承的权限
    FROM permissions p
    INNER JOIN user_permissions up ON p.parent_id = up.id
    WHERE p.is_active = true
      AND up.level < 2  -- 最多递归到 function 层级
  )
  SELECT DISTINCT * FROM user_permissions
  ORDER BY direct_assigned DESC, level, type;
`, [roleIds]);
```

**注意**：权限继承是可选功能，如果不需要，直接查询用户分配的权限即可。

#### 5.2.5 权限信息使用

```typescript
// 获取用户的所有权限代码（只包含 function 类型）
const permissionCodes = user.permissions
  .filter(p => p.type === 'function' && p.is_active)
  .map(p => p.code);

// 权限检查时直接使用 code（只检查 function 类型）
function hasPermission(user: AuthUser, code: string): boolean {
  return user.permissions.some(
    p => p.type === 'function' && p.code === code && p.is_active
  );
}
```

#### 5.2.6 路由权限检查（使用 page_path）

由于权限信息中包含了 `page_path`，可以直接判断路由权限：

```typescript
// 检查用户是否有权限访问某个页面路径
function hasPagePermission(user: AuthUser, pagePath: string): boolean {
  if (user.is_superuser) {
    return true;
  }
  
  // 直接查找是否有对应的 page 权限
  return user.permissions.some(
    p => p.type === 'page' && p.page_path === pagePath && p.is_active
  );
}

// 或者检查用户是否有该页面下的任意 function 权限
function hasPagePermissionByFunction(user: AuthUser, pagePath: string): boolean {
  if (user.is_superuser) {
    return true;
  }
  
  // 查找对应的 page 节点
  const pagePermission = user.permissions.find(
    p => p.type === 'page' && p.page_path === pagePath
  );
  
  if (!pagePermission) return false;
  
  // 检查是否有该 page 下的任意 function 权限
  return user.permissions.some(
    p => p.type === 'function' && p.parent_id === pagePermission.id && p.is_active
  );
}
```

#### 5.2.7 注意事项

1. **存储完整的权限树结构**：
   - 所有类型的权限（module、page、function）都可以分配给角色
   - 用户权限信息中包含所有直接分配的权限
   - 如果实现了权限继承功能，还会包含继承的权限

2. **必须包含的字段**：
   - `code`：function 类型必填，用于功能权限检查
   - `page_path`：page 类型必填，用于路由权限检查
   - `parent_id`：用于构建权限树结构

3. **性能考虑**：
   - 使用递归 CTE 可以一次性查询完整的权限树，比多次查询更高效
   - 考虑缓存权限信息，避免每次请求都查询数据库
   - 如果权限数量很多，可以考虑只存储必要的字段（code、page_path）

4. **权限更新**：
   - 如果用户权限发生变化，需要重新登录或刷新 session
   - 或者实现权限刷新机制，定期更新 session 中的权限信息

5. **数据一致性**：
   - 确保查询的 page 和 module 节点都是 `is_active = true`
   - 如果某个 page 被禁用，其下的 function 权限也应该不可用

### 5.3 路由权限校验

由于所有类型的权限都可以分配给角色，路由权限校验变得非常简单和直接。

**路由权限校验逻辑：**

1. **直接通过 page_path 检查**：
   - 如果用户拥有某个 `page` 类型的权限，可以直接访问该页面
   - 如果用户拥有某个 `module` 类型的权限，理论上可以访问该模块下的所有页面
   - **注意**：如果只分配了 module 权限，需要额外的逻辑来判断某个 page 是否属于该 module：
     - 方式1：实现权限继承功能，自动包含子节点权限
     - 方式2：在路由检查时，查询数据库获取该 page 的 parent_id，然后检查用户是否有对应的 module 权限
     - 方式3：在用户权限信息中包含完整的树结构（通过权限继承实现）
   - 例如：用户有 `/admin/users` 页面的权限，就可以访问该页面

2. **路由权限检查函数**：
```typescript
// 检查用户是否有权限访问某个页面路径
function hasPagePermission(user: AuthUser, pagePath: string): boolean {
  if (user.is_superuser) {
    return true;
  }
  
  // 方式1：直接检查是否有对应的 page 权限
  const hasPage = user.permissions.some(
    p => p.type === 'page' && p.page_path === pagePath && p.is_active
  );
  
  if (hasPage) return true;
  
  // 方式2：检查是否有对应的 module 权限
  // 如果用户权限信息中包含完整的树结构（包括 parent_id），可以通过 parent_id 查找
  // 注意：这需要用户权限信息中包含 page 的 parent_id，或者需要额外的数据库查询
  // 如果用户只分配了 module 权限，需要查询数据库获取该 module 下的所有 page
  // 这里简化处理，实际实现时建议：
  // - 如果用户权限信息中包含 parent_id，可以通过 parent_id 查找 module
  // - 或者实现权限继承功能，自动包含子节点权限
  // - 或者需要额外的数据库查询来获取 page 对应的 module
  
  return false;
}

// 更严格的检查：必须同时有 page 权限和至少一个 function 权限
function hasPagePermissionStrict(user: AuthUser, pagePath: string): boolean {
  if (user.is_superuser) {
    return true;
  }
  
  // 查找对应的 page 节点
  const pagePermission = user.permissions.find(
    p => p.type === 'page' && p.page_path === pagePath && p.is_active
  );
  
  if (!pagePermission) return false;
  
  // 检查是否有该 page 下的任意一个 function 权限
  return user.permissions.some(
    p => p.type === 'function' && p.parent_id === pagePermission.id && p.is_active
  );
}
```

3. **路由守卫实现**：
```typescript
// 在路由守卫或中间件中使用
const canAccessPage = hasPagePermission(user, '/admin/users');
if (!canAccessPage) {
  // 重定向到无权限页面或登录页
  router.push('/admin/login');
}
```

4. **侧边栏菜单过滤**：
   - 侧边栏菜单项可以直接根据 `page_path` 来显示/隐藏
   - 例如：用户有 `/admin/users` 页面的权限，就显示"用户管理"菜单项
   - 实现方式：检查用户权限列表中是否存在对应的 `page` 或 `module` 权限

**优势：**
- ✅ 直接通过 `page_path` 检查，无需额外的数据库查询
- ✅ 逻辑简单清晰，性能更好
- ✅ 支持灵活的权限分配：可以只分配 page 权限，也可以分配 module 权限
- ✅ 前端可以直接使用权限信息进行路由守卫和菜单过滤

**注意事项：**
- 如果用户只拥有 `page` 权限但没有 `function` 权限，可以访问页面但无法执行操作
- 如果用户只拥有 `module` 权限，可以访问该模块下的所有页面（但具体操作需要 function 权限）
- 确保查询时只包含 `is_active = true` 的权限节点

### 5.4 权限代码规范

权限代码（code）的命名规范：
- 格式：`{resource}.{action}`
- 示例：
  - `users.view` - 查看用户列表
  - `users.create` - 创建用户
  - `users.edit` - 编辑用户
  - `users.delete` - 删除用户
  - `admin.dashboard` - 查看管理仪表板
  - `admin.settings` - 系统设置

## 6. 开发步骤

### 阶段1：数据库迁移
1. ✅ 创建数据库迁移脚本
2. ✅ 重建 permissions 表结构
3. ✅ 创建初始权限树数据
4. ✅ 验证数据完整性

### 阶段2：后端API开发
1. ✅ 更新权限类型定义
2. ✅ 实现权限树查询API
3. ✅ 实现权限CRUD API（支持树形结构）
4. ✅ 实现权限移动API
5. ✅ 更新角色权限分配API
6. ✅ 更新权限检查逻辑（保持兼容）

### 阶段3：前端组件开发
1. ✅ 创建 PermissionTree 组件
2. ✅ 更新权限管理页面（树形展示）
3. ✅ 更新权限创建/编辑表单
4. ✅ 更新角色管理页面（树形权限选择）
5. ✅ 更新权限检查相关组件

### 阶段4：测试和优化
1. ✅ 功能测试
2. ✅ 数据迁移验证
3. ✅ 性能优化
4. ✅ UI/UX 优化

## 7. 需要修改的文件清单

### 7.1 数据库相关
- [ ] `sql/init_ddl.sql` - 更新表结构
- [ ] `sql/migrations/xxx_permission_tree.sql` - 创建迁移脚本

### 7.2 类型定义
- [ ] `web/src/types/database/auth.ts` - 更新 Permission 接口

### 7.3 后端API
- [ ] `web/src/app/api/admin/permissions/route.ts` - 更新权限列表API
- [ ] `web/src/app/api/admin/permissions/tree/route.ts` - 新增权限树API
- [ ] `web/src/app/api/admin/permissions/[id]/route.ts` - 更新权限CRUD
- [ ] `web/src/app/api/admin/permissions/[id]/move/route.ts` - 新增移动权限API
- [ ] `web/src/app/api/admin/roles/[id]/permissions/tree/route.ts` - 新增角色权限树API
- [ ] `web/src/app/api/admin/roles/[id]/permissions/route.ts` - 更新权限分配API

### 7.4 权限检查逻辑
- [ ] `web/src/lib/server/services/auth.ts` - 更新权限加载逻辑
- [ ] `web/src/lib/client/services/auth.ts` - 更新权限检查逻辑
- [ ] `web/src/lib/server/auth.ts` - 更新服务端权限检查
- [ ] `web/src/components/auth/PermissionGuard.tsx` - 更新为使用 code 进行权限检查

### 7.5 前端页面
- [ ] `web/src/app/admin/permissions/page.tsx` - 重写为树形展示
- [ ] `web/src/components/admin/RoleModal.tsx` - 更新为树形权限选择
- [ ] `web/src/app/admin/roles/page.tsx` - 可能需要调整

### 7.6 前端组件
- [ ] `web/src/components/admin/PermissionTree.tsx` - 新建树形组件
- [ ] `web/src/components/admin/PermissionTreeNode.tsx` - 新建树节点组件

## 8. 注意事项

### 8.1 权限检查更新
- 权限检查改为直接使用 `code` 字段
- 所有使用 `resource + action` 的权限检查代码需要更新为使用 `code`
- 可以提供辅助函数 `hasPermissionByResourceAction` 用于过渡

### 8.2 数据完整性
- 确保所有 function 类型的权限都有有效的 `code`（应用层验证，数据库层面code字段为UNIQUE但允许NULL）
- 确保所有 page 类型的权限都有有效的 `page_path`
- 确保树结构完整，没有孤立节点
- 删除权限时的约束：
  - **应用层检查**：删除前检查是否有子节点，如果有则不允许删除（防止误删整个子树）
  - **应用层检查**：删除前检查是否已分配给角色，如果已分配则提示确认
  - **数据库层面**：虽然设置了 `ON DELETE CASCADE`，但应用层会先检查，避免级联删除
- `code` 字段唯一性：虽然 `code` 字段设置了 UNIQUE 约束，但 module 和 page 类型的 code 是可选的，只有 function 类型必须要有 code，命名规范不同（module: "system", page: "users.page", function: "users.view"），不会产生冲突
- **权限分配**：所有类型的权限（module、page、function）都可以分配给角色，提供更灵活的权限控制

### 8.3 性能考虑
- 权限树查询可能需要递归，注意性能优化
- 考虑缓存权限树数据
- 批量操作时注意事务处理

### 8.4 用户体验
- 树形结构要支持大量节点时的性能
- 提供清晰的权限信息展示
- 支持快速搜索和筛选

## 9. 测试计划

### 9.1 单元测试
- 权限树构建逻辑
- 权限检查逻辑
- 权限CRUD操作

### 9.2 集成测试
- 权限分配流程
- 权限检查流程
- 数据迁移流程

### 9.3 用户测试
- 权限管理界面易用性
- 角色权限分配流程
- 权限检查准确性

## 10. 风险评估

### 10.1 数据迁移风险
- **风险**：**数据迁移失败或数据丢失
- **应对**：**备份数据库，分步骤迁移，充分测试

### 10.2 代码更新风险
- **风险**：需要更新所有权限检查代码，从 `resource + action` 改为使用 `code`
- **应对**：提供辅助函数过渡，逐步更新所有调用点，充分测试

### 10.3 性能风险
- **风险**：**树形查询可能影响性能
- **应对**：**添加索引，优化查询，考虑缓存

## 11. 后续优化方向

1. 权限模板：支持权限模板，快速创建常用权限组合
2. 权限继承：支持权限继承机制
3. 权限审计：记录权限变更历史
4. 权限导入导出：支持权限配置的导入导出
5. 动态权限：支持运行时动态创建权限

---

**文档版本**：v1.0  
**创建日期**：2024-12-19  
**最后更新**：2024-12-19

