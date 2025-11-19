# PostgreSQL 迁移指南

本文档描述了项目如何从 Supabase 迁移到原生 PostgreSQL。

## 已完成的更改

### 1. 依赖更新（已完成）
- 移除了 `@supabase/supabase-js` 依赖
- 添加了 `pg` (PostgreSQL Node.js 客户端) 依赖
- 更新了 `package.json`

### 2. 数据库连接（已完成）
- 创建了新的数据库配置文件 `lib/db/config.ts`
- 创建了 PostgreSQL 客户端 `lib/db/client.ts`
- 移除了 Supabase 客户端

### 3. 认证系统重构
- 重构了认证服务以使用基于 JWT 的会话管理
- 更新了 `lib/services/newAuthService.ts`
- 创建了自定义的权限系统

### 4. API 路由更新
所有管理员 API 路由已更新为使用 PostgreSQL：
- `/api/admin/settings`
- `/api/admin/users/[id]`
- `/api/admin/users`
- `/api/admin/roles/[id]`
- `/api/admin/roles`
- `/api/admin/permissions/[id]`
- `/api/admin/permissions`
- `/api/admin/experiences`
- `/api/admin/experiences/generate-embeddings`

### 5. 前端组件更新
所有管理页面已更新为移除 Supabase 依赖：
- `/admin/dashboard/page.tsx`
- `/admin/settings/page.tsx`
- `/admin/review/page.tsx`
- `/admin/users/page.tsx`

## 环境配置

### 1. 数据库环境变量
在 `.env.local` 文件中配置以下变量：

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=recall_kit
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
```

### 2. 认证环境变量
```env
# Authentication
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here
```

### 3. AI 服务配置
```env
# AI Service Configuration
AI_SERVICE_TYPE=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_MODEL=text-embedding-3-small
```

参考 `.env.example` 文件获取完整的配置示例。

## 数据库设置

### 1. 安装 PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# 下载并安装 PostgreSQL 官方安装包
```

### 2. 创建数据库
```sql
-- 连接到 PostgreSQL
psql -U postgres

-- 创建数据库
CREATE DATABASE recall_kit;

-- 创建用户（可选）
CREATE USER recall_kit_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE recall_kit TO recall_kit_user;
```

### 3. 运行迁移
迁移文件位于 `database_init.sql` 或从备份中恢复：

```bash
# 运行数据库初始化脚本
psql -U postgres -d recall_kit -f database_init.sql

# 或者从备份恢复
psql -U postgres -d recall_kit < backup.sql
```

## 重要注意事项

### 1. 数据迁移（已完成）
数据已从 Supabase 迁移到 PostgreSQL。如果需要重新迁移：
1. 从 Supabase 导出数据
2. 转换数据格式以适配 PostgreSQL
3. 导入到新的 PostgreSQL 数据库

### 2. 权限系统
新的权限系统使用了应用层权限控制：
- 通过应用代码实现权限验证
- 匿名用户只能读取已发布记录
- 只有管理员可以更新/删除记录

### 3. 会话管理
- 使用 JWT 令牌替代 Supabase 的会话管理
- 令牌存储在 localStorage 中
- 需要实现令牌刷新机制

### 4. 实时功能
Supabase 的实时订阅功能已被移除。如果需要实时功能，需要：
- 实现 WebSocket 连接
- 或使用轮询机制
- 或集成其他实时解决方案

## 测试

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 测试功能
- 用户登录/登出
- 管理员功能
- 权限控制
- 数据操作

## 故障排除

### 1. 连接错误
- 检查数据库服务是否运行
- 验证连接参数
- 确认防火墙设置

### 2. 权限错误
- 确认数据库用户权限
- 检查表和模式的访问权限

### 3. 认证错误
- 验证 JWT 密钥配置
- 检查令牌格式和有效期

## 后续步骤

1. **数据迁移**：将现有数据从 Supabase 迁移到 PostgreSQL
2. **功能测试**：全面测试所有功能
3. **性能优化**：根据需要优化数据库查询
4. **监控设置**：配置数据库监控和日志记录

## 支持

如果在迁移过程中遇到问题，请：
1. 检查日志文件
2. 验证环境配置
3. 确认数据库连接和权限
4. 测试各个组件的集成