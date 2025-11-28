# NextAuth.js 迁移计划

## 概述

将当前的自定义鉴权系统迁移到 NextAuth.js (Auth.js) v5，以利用其标准化、安全性和社区支持。

## 当前系统分析

### 现有功能
1. ✅ 基于数据库的 Session 管理
2. ✅ 用户名/密码登录（Credentials）
3. ✅ 角色和权限系统（RBAC）
4. ✅ 自定义 Session Token 存储
5. ✅ 中间件路由保护

### 数据库结构
- `users` 表：用户信息
- `user_sessions` 表：Session 存储
- `roles` 表：角色
- `user_roles` 表：用户角色关联
- `permissions` 表：权限
- `role_permissions` 表：角色权限关联

## 迁移策略

### 阶段 1：安装和基础配置
1. 安装 NextAuth.js v5
2. 创建基础配置文件
3. 配置环境变量

### 阶段 2：自定义 Provider 和适配器
1. 创建 Credentials Provider（适配现有数据库）
2. 创建自定义数据库适配器（适配现有表结构）
3. 集成角色和权限系统

### 阶段 3：更新应用代码
1. 更新中间件
2. 更新登录页面
3. 更新 API 路由
4. 更新客户端组件

### 阶段 4：测试和清理
1. 功能测试
2. 移除旧代码
3. 更新文档

## 技术决策

### NextAuth.js 版本选择
- **选择**: NextAuth.js v5 (Auth.js)
- **原因**: 
  - 支持 Next.js 15 App Router
  - 更好的 TypeScript 支持
  - 更灵活的配置

### Session 策略
- **选择**: Database Session
- **原因**: 
  - 已有数据库结构
  - 需要服务端 Session 控制
  - 支持 Session 过期管理

### Provider 选择
- **选择**: Credentials Provider（自定义）
- **原因**: 
  - 使用现有数据库用户
  - 需要集成角色和权限

## 实施步骤

### 步骤 1: 安装依赖

```bash
npm install next-auth@beta
```

### 步骤 2: 创建配置文件

创建 `app/api/auth/[...nextauth]/route.ts`

### 步骤 3: 创建自定义适配器

适配现有的数据库结构，包括：
- 用户表
- Session 表
- 角色和权限查询

### 步骤 4: 配置 Credentials Provider

集成现有的密码验证逻辑（bcrypt）

### 步骤 5: 更新中间件

使用 NextAuth.js 的中间件保护路由

### 步骤 6: 更新客户端代码

使用 `useSession` hook 和 `signIn`/`signOut` 函数

### 步骤 7: 更新服务端代码

使用 `getServerSession` 获取会话

## 兼容性考虑

### 需要保持的功能
1. ✅ 现有的角色和权限系统
2. ✅ 用户数据结构
3. ✅ Session 过期机制
4. ✅ 中间件路由保护

### 可以改进的地方
1. ✅ 标准化的 Session 管理
2. ✅ 更好的类型安全
3. ✅ 内置的 CSRF 保护
4. ✅ 更好的错误处理

## 风险评估

### 低风险
- 安装和配置 NextAuth.js
- 创建自定义 Provider

### 中风险
- 数据库适配器开发
- 权限系统集成

### 高风险
- 现有功能迁移
- 数据迁移（如果需要）

## 回滚计划

1. 保留当前实现作为备份
2. 使用功能开关控制新旧系统
3. 逐步迁移，分阶段测试

## 时间估算

- 阶段 1: 1-2 小时
- 阶段 2: 2-3 小时
- 阶段 3: 3-4 小时
- 阶段 4: 1-2 小时

**总计**: 7-11 小时

