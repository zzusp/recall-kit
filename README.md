# Recall Kit - AI开发经验分享平台

## 项目简介

Recall Kit 是一个基于 MCP (Model Context Protocol) 协议的经验分享平台，旨在解决 AI 开发过程中重复对话和 token 浪费的问题。通过记录、分享和复用开发经验，让 AI Agent 能够自动查询和复用历史经验，提高开发效率。

### 📹 项目演示

[观看项目演示视频](docs/recall-kit.mp4)

### 首页
![alt text](docs/dashboard.png)

### 相关文档
- [用Comate开发我的第一个MCP🚀](https://juejin.cn/post/7573528564026425390)
- [🤦让你的Vibe Coding长长脑子🧠](https://juejin.cn/post/7572749797469650953)


## 项目背景

在 vibe coding 过程中，经常会出现 AI 抓不到重点、而用户又不知道问题在哪里的情况。用户往往只能通过"问题没修复"、"不是我要的效果"等模糊提示词继续对话，导致 AI 不断尝试各种解决方案，造成对话成本增加、token 浪费。或者为了保留之前的上下文记录，始终使用一个对话，导致上下文压缩再压缩。

Recall Kit 通过以下方式解决这个问题：
- **经验记录**：AI 自动总结并保存成功解决问题的经验至 Recall Kit 平台
- **智能检索**：通过 MCP 协议让 AI Agent 自动查询相关经验
- **经验复用**：支持高效复用历史解决方案，帮助快速定位和解决当前问题，显著减少重复排查与沟通成本

## 系统架构

Recall Kit 由三个核心模块组成：

### 1. MCP Server
为 AI Agent 提供经验查询和提交服务的 MCP 服务器。

**详细文档**: [mcp-server/README.md](mcp-server/README.md)

### 2. Web 应用
提供 Web 界面用于搜索、浏览和管理经验记录。

**详细文档**: [web/README.md](web/README.md)

### 3. 数据库
基于 PostgreSQL 的数据存储，支持向量搜索和全文搜索。

## 技术栈概览

- **前端**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **后端**: MCP Server (TypeScript), Express
- **数据库**: PostgreSQL (pgvector)
- **搜索**: 向量搜索 (OpenAI Embedding) + 全文搜索 (PostgreSQL FTS)
- **协议**: Model Context Protocol (MCP)

## 项目结构

```
recall-kit/
├── web/                    # Next.js Web 应用
│   └── README.md          # Web 应用详细文档
│
├── mcp-server/            # MCP 服务器
│   └── README.md          # MCP Server 详细文档
│
├── supabase/              # 数据库迁移文件
│   └── migrations/        # SQL 迁移脚本
├── database_init.sql      # 数据库初始化脚本
│
├── specs/                 # 项目规范和文档
│   └── 001-experience-sharing-platform/
│
└── docs/                  # 技术文档
    ├── VECTOR_SEARCH.md
    └── MCP_*.md
```

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- PostgreSQL 数据库
- OpenAI API Key（可选，用于向量搜索）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd recall-kit
```

2. **安装依赖**

分别进入 `web` 和 `mcp-server` 目录安装依赖：
```bash
cd web && npm install
cd ../mcp-server && npm install
```

3. **配置环境变量**

- Web 应用：在 `web` 目录下创建 `.env.local`，参考 [web/README.md](web/README.md#环境变量配置)
- MCP Server：在 `mcp-server` 目录下创建 `.env`，参考 [mcp-server/README.md](mcp-server/README.md#环境变量配置)

4. **设置数据库**

创建 PostgreSQL 数据库并运行迁移脚本：
```bash
# 创建数据库
createdb recall_kit

# 运行初始化脚本
psql -d recall_kit -f database_init.sql

# 或者按顺序运行迁移文件
psql -d recall_kit -f supabase/migrations/001_initial_schema.sql
# ... 依次运行其他迁移文件
```

5. **启动服务**

```bash
# 启动 Web 应用（终端 1）
cd web
npm run dev

# 启动 MCP Server（终端 2）
cd mcp-server
npm run dev
```

- Web 应用: http://localhost:3000
- MCP Server: http://localhost:3001/mcp

## 详细文档

### 子项目文档
- **[Web 应用文档](web/README.md)** - Web 应用的详细说明、API 文档、开发指南
- **[MCP Server 文档](mcp-server/README.md)** - MCP Server 的详细说明、协议文档、部署指南

### 技术文档
- [向量搜索使用指南](docs/VECTOR_SEARCH.md) - 向量搜索功能配置和使用
- [MCP Server 使用说明](docs/MCP_SERVER_USAGE.md) - MCP Server 使用和集成指南
- [项目规范](specs/001-experience-sharing-platform/spec.md) - 项目功能规范和需求

## 数据库迁移

数据库迁移文件位于 `supabase/migrations/` 目录，按顺序执行：

1. `001_initial_schema.sql` - 初始表结构
2. `002_rls_policies.sql` - Row Level Security 策略
3. `003_indexes.sql` - 索引
4. `004_seed_data.sql` - 种子数据
5. `005_add_view_count.sql` - 浏览次数
6. `006_add_fts_column.sql` - 全文搜索列
7. `007_*.sql` - 其他功能
8. `008_add_vector_search.sql` - 向量搜索支持
9. `010_*.sql` - 设置表
10. `011_*.sql` - AI 配置
11. `012_*.sql` - 动态 embedding 维度
12. `013_*.sql` - embedding 标志

## 开发

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 配置
- 提交前运行 `npm run lint` 和 `npm run type-check`

### 开发命令

各子项目的开发命令请参考对应的 README：
- [Web 应用开发命令](web/README.md#开发命令)
- [MCP Server 开发命令](mcp-server/README.md#开发命令)

## 许可证

查看 [LICENSE](LICENSE) 文件了解详情。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过 Issue 反馈。
