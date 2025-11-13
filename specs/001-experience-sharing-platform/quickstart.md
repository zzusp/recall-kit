# Quick Start Guide: 经验分享平台

**Feature**: 001-experience-sharing-platform  
**Date**: 2025-01-27

## 前置要求

- Node.js 20.x LTS
- pnpm 8.x
- Supabase账户
- Git

## 项目初始化

### 1. 克隆仓库

```bash
git clone <repository-url>
cd recall-kit
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置Supabase

1. 在Supabase创建新项目
2. 复制项目URL和anon key
3. 创建`.env`文件：

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI服务配置
OPENAI_API_KEY=your-openai-api-key
# 或
ANTHROPIC_API_KEY=your-anthropic-api-key

# MCP Server配置
MCP_SERVER_PORT=3001
```

### 4. 运行数据库迁移

```bash
cd supabase
supabase db push
```

或手动执行迁移文件：
```bash
psql -h <supabase-host> -U postgres -d postgres -f migrations/001_initial_schema.sql
psql -h <supabase-host> -U postgres -d postgres -f migrations/002_rls_policies.sql
psql -h <supabase-host> -U postgres -d postgres -f migrations/003_indexes.sql
psql -h <supabase-host> -U postgres -d postgres -f migrations/004_functions_triggers.sql
psql -h <supabase-host> -U postgres -d postgres -f migrations/005_seed_data.sql
```

### 5. 创建第一个管理员账户

执行seed脚本或通过Supabase Dashboard手动创建：

```sql
INSERT INTO profiles (id, username, email, role)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@example.com',
  'admin'
);
```

## 开发环境启动

### 启动所有服务（开发模式）

```bash
pnpm dev
```

这将启动：
- Web项目: http://localhost:3000 (Next.js，包含前端和API Routes)
- MCP Server: http://localhost:3001

### 单独启动各个模块

```bash
# Web项目（Next.js全栈，包含search和admin）
cd web
pnpm dev
# 访问 http://localhost:3000 (search模块)
# 访问 http://localhost:3000/admin (admin模块)

# MCP Server
cd mcp-server
pnpm dev
```

## 项目结构说明

```
recall-kit/
├── web/                 # Web项目（Next.js全栈）
│   ├── src/app/         # Next.js App Router（包含search和admin路由组）
│   ├── src/api/         # Next.js API Routes（后端API）
│   └── src/components/  # React组件
├── mcp-server/          # MCP Server项目（独立服务）
├── mcp-client/          # MCP Client项目（客户端工具）
├── supabase/            # Supabase配置和迁移（共享）
└── tests/               # 测试文件
```

## 开发工作流

### 1. 创建新功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发功能

在各个模块中开发功能，使用TypeScript确保类型安全。

### 3. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定模块的测试
cd web
pnpm test
```

### 4. 代码检查

```bash
# ESLint检查
pnpm lint

# 类型检查
pnpm type-check

# 格式化代码
pnpm format
```

### 5. 提交代码

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

## 构建生产版本

### 构建所有模块

```bash
pnpm build
```

### 单独构建

```bash
# Web项目
cd web
pnpm build

# MCP Server
cd mcp-server
pnpm build

# MCP Client
cd mcp-client
pnpm build
```

## 部署

### Web项目部署

部署到Vercel（推荐）或其他支持Next.js的平台：

```bash
cd web
vercel deploy
```

Next.js会自动处理前端页面和后端API Routes的部署。

### MCP Server部署

部署到Node.js服务器或Docker容器：

```bash
cd mcp-server
docker build -t recall-kit-mcp-server .
docker run -p 3001:3001 recall-kit-mcp-server
```

### MCP Client分发

发布为npm包供用户安装：

```bash
cd mcp-client
npm publish
```

用户安装后可以在本地使用MCP Client与MCP Server通信。

用户安装：
```bash
npm install -g @recall-kit/mcp-client
recall-kit-client init
```

## 环境变量说明

### 开发环境 (.env.development)

```bash
NODE_ENV=development
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### 生产环境 (.env.production)

```bash
NODE_ENV=production
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

## 常见问题

### 1. Supabase连接失败

检查：
- `.env`文件中的URL和key是否正确
- Supabase项目是否已创建
- 网络连接是否正常

### 2. 数据库迁移失败

检查：
- PostgreSQL版本是否>=15
- 是否有足够的权限
- 迁移文件是否按顺序执行

### 3. MCP Client无法连接Server

检查：
- MCP Server是否已启动
- 配置文件中的server URL是否正确
- 防火墙设置

## 下一步

- 阅读 [API文档](./contracts/)
- 查看 [数据库设计](./data-model.md)
- 参考 [实现计划](./plan.md)

