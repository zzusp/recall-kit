# Recall Kit Web 应用

## 简介

Recall Kit Web 是 Recall Kit 项目的 Web 前端应用，基于 Next.js 15 构建，提供经验搜索、浏览和管理功能。

## 功能特性

### 搜索模块
- **首页** (`/`) - 平台介绍和最新经验展示
- **搜索页** (`/search`) - 支持关键词搜索和向量搜索
- **列表页** (`/list`) - 浏览所有已发布的经验记录
- **详情页** (`/experience/[id]`) - 查看经验记录的完整信息

### 管理模块
- **登录** (`/admin/login`) - 管理员身份验证
- **控制面板** (`/admin/dashboard`) - 数据统计和概览
- **审核页面** (`/admin/review`) - 审核、编辑、删除经验记录
- **系统设置** (`/admin/settings`) - AI 配置和系统参数

### 核心功能
- ✅ **向量搜索** - 基于语义相似度的智能搜索
- ✅ **全文搜索** - 关键词匹配搜索（降级方案）
- ✅ **响应式设计** - 适配各种设备尺寸
- ✅ **匿名访问** - 无需登录即可搜索和浏览
- ✅ **管理员认证** - 基于 JWT 的身份验证

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI 库**: React 18
- **样式**: Tailwind CSS
- **语言**: TypeScript 5.3+
- **数据库**: PostgreSQL (原生)
- **认证**: JWT (自定义实现)
- **状态管理**: Zustand
- **数据验证**: Zod
- **字体**: Inter, Poppins, Open Sans
- **图标**: Font Awesome 6.4

## 项目结构

```
web/
├── __tests__/                 # 测试文件（项目根目录，符合Next.js规范）
│   └── utils/
│       └── test-toast.ts
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (search)/          # 搜索相关页面（路由组）
│   │   │   ├── page.tsx       # 首页
│   │   │   ├── search/        # 搜索页
│   │   │   ├── list/          # 列表页
│   │   │   └── layout.tsx     # 搜索模块布局
│   │   ├── admin/             # 管理后台
│   │   │   ├── login/         # 登录页
│   │   │   ├── dashboard/     # 控制面板
│   │   │   ├── review/        # 审核页面
│   │   │   ├── settings/      # 系统设置
│   │   │   └── layout.tsx    # 管理后台布局
│   │   ├── api/               # API 路由
│   │   │   ├── experiences/   # 经验相关 API
│   │   │   ├── admin/         # 管理相关 API
│   │   │   ├── auth/          # 认证相关 API
│   │   │   └── api-keys/      # API密钥相关 API
│   │   ├── experience/        # 经验详情页
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── layout.tsx         # 根布局
│   │   └── globals.css        # 全局样式
│   ├── components/            # React 组件
│   │   ├── admin/             # 管理后台组件
│   │   ├── auth/              # 认证相关组件
│   │   ├── experience/        # 经验相关组件
│   │   ├── ui/                # 通用UI组件
│   │   └── Header.tsx         # 页头组件
│   ├── config/                # 配置文件
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── database.ts
│   │   └── environment.ts
│   ├── lib/                   # 工具函数和服务
│   │   ├── server/            # 服务端专用代码（只在服务端运行）
│   │   │   ├── services/      # 服务端业务服务
│   │   │   │   ├── auth.ts    # 认证服务
│   │   │   │   ├── experience.ts  # 经验服务
│   │   │   │   ├── embedding.ts   # 嵌入服务
│   │   │   │   └── apiKey.ts      # API密钥服务
│   │   │   └── db/            # 数据库相关
│   │   │       ├── client.ts  # 数据库客户端
│   │   │       └── config.ts  # 数据库配置
│   │   ├── client/            # 客户端专用代码（只在客户端运行）
│   │   │   └── services/      # 客户端业务服务
│   │   │       ├── auth.ts    # 客户端认证服务
│   │   │       ├── api.ts     # API客户端
│   │   │       └── toast.ts   # Toast通知服务
│   │   ├── middleware/        # 中间件相关
│   │   │   ├── apiKeyAuth.ts
│   │   │   └── authMiddleware.ts
│   │   └── utils/             # 共享工具函数（服务端和客户端都可使用）
│   │       ├── apiResponse.ts
│   │       ├── errorHandler.ts
│   │       └── simpleErrorHandler.ts
│   └── types/                 # TypeScript 类型定义
│       ├── api/
│       │   └── common.ts
│       └── database/
│           ├── auth.ts
│           ├── experience.ts
│           └── index.ts
├── middleware.ts              # Next.js 中间件（认证）
├── next.config.js             # Next.js 配置
├── tailwind.config.js         # Tailwind CSS 配置
├── tsconfig.json              # TypeScript 配置
└── package.json               # 依赖配置
```

### 目录结构说明

- **符合Next.js 15官方规范**：遵循App Router架构和文件命名约定
- **服务端/客户端分离**：`lib/server/` 和 `lib/client/` 明确区分服务端和客户端代码
- **测试文件位置**：测试文件放在项目根目录的 `__tests__/`，符合Next.js推荐
- **路由组织**：使用路由组 `(search)` 组织相关路由，不影响URL路径

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- PostgreSQL 数据库

### 安装

```bash
# 安装依赖
npm install
```

### 环境变量配置

在项目根目录创建 `.env.local` 文件：

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=recall_kit
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# AI Service Configuration
AI_SERVICE_TYPE=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_MODEL=text-embedding-3-small

# Application
NODE_ENV=production
NEXTAUTH_SECRET=your_nextauth_secret
```

### 开发

```bash
# 启动开发服务器
npm run dev

# 应用将在 http://localhost:3000 运行
```

### 构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 开发命令

```bash
npm run dev          # 启动开发服务器（热重载）
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 运行 ESLint 检查
npm run type-check   # TypeScript 类型检查
npm test             # 运行测试
npm run test:watch   # 监听模式运行测试
npm run test:coverage # 生成测试覆盖率报告
```

## 核心服务

### ExperienceService

经验记录的核心服务，提供：
- 查询经验记录（支持向量搜索和全文搜索）
- 获取热门关键字
- 自动降级机制（向量搜索不可用时使用全文搜索）

### EmbeddingService

向量搜索服务，提供：
- 生成文本 embedding
- 向量搜索
- 可用性检查

### AuthService

认证服务，提供：
- 管理后台登录
- 会话管理
- 权限验证

## API 路由

### 公开 API

- `GET /api/experiences` - 查询经验记录
- `GET /api/experiences/[id]` - 获取单个经验记录
- `POST /api/experiences/[id]/embedding` - 为经验记录生成 embedding

### 管理 API（需要认证）

- `GET /api/admin/experiences` - 获取所有经验记录（管理用）
- `POST /api/admin/experiences` - 创建经验记录
- `PUT /api/admin/experiences/[id]` - 更新经验记录
- `DELETE /api/admin/experiences/[id]` - 删除经验记录
- `POST /api/admin/experiences/generate-embeddings` - 批量生成 embedding
- `GET /api/admin/settings` - 获取系统设置
- `PUT /api/admin/settings` - 更新系统设置

## 页面路由

### 公开页面

- `/` - 首页
- `/search` - 搜索页
- `/list` - 列表页
- `/experience/[id]` - 经验详情页

### 管理页面（需要登录）

- `/admin/login` - 管理后台登录
- `/admin/dashboard` - 控制面板
- `/admin/review` - 审核页面
- `/admin/settings` - 系统设置

## 样式系统

项目使用 Tailwind CSS 进行样式管理，主要特点：

- **现代化设计** - 使用渐变、阴影、动画等现代 UI 元素
- **响应式布局** - 移动端优先，适配各种屏幕尺寸
- **自定义组件** - 可复用的 UI 组件样式
- **主题一致性** - 统一的颜色、字体、间距系统

## 认证流程

1. 用户访问 `/admin/login` 页面
2. 输入用户名和密码
3. 通过自定义认证系统验证
4. 生成 JWT 令牌
5. 中间件 (`middleware.ts`) 检查认证状态
6. 已认证用户可访问管理页面
7. 未认证用户重定向到登录页

## 向量搜索

向量搜索功能已集成到搜索体验中：

1. 用户输入搜索查询
2. 系统尝试使用向量搜索（如果可用）
3. 如果向量搜索失败或不可用，自动降级到全文搜索
4. 返回搜索结果

详细说明请参考根目录的 `docs/VECTOR_SEARCH.md`。

## 开发注意事项

### TypeScript

- 所有代码使用 TypeScript 编写
- 类型定义位于 `src/types/` 目录
- 数据库类型手动定义和维护

### 代码规范

- 使用 ESLint 和 Prettier 进行代码格式化
- 提交前运行 `npm run lint` 和 `npm run type-check`
- 遵循 Next.js 15 最佳实践

### 性能优化

- 使用 Next.js App Router 的 Server Components
- 适当的缓存策略
- 图片优化（如需要）
- 代码分割和懒加载

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 部署

### Vercel（推荐）

1. 将代码推送到 Git 仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### 其他平台

```bash
# 构建
npm run build

# 启动
npm start
```

确保设置以下环境变量：
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- `OPENAI_API_KEY`（可选，用于向量搜索）

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查环境变量是否正确
   - 确认 PostgreSQL 服务是否运行
   - 验证数据库用户权限

2. **向量搜索不工作**
   - 检查 OpenAI API Key 是否配置
   - 确认数据库迁移已执行
   - 检查 embedding 数据是否存在

3. **认证问题**
   - 检查中间件配置
   - 确认 JWT 密钥配置正确
   - 验证数据库中的用户数据

## 相关文档

- [项目根目录 README](../README.md)
- [向量搜索指南](../docs/VECTOR_SEARCH.md)
- [PostgreSQL 迁移指南](../POSTGRES_MIGRATION.md)
- [Next.js 文档](https://nextjs.org/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

