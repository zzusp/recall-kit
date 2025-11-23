# Recall Kit - AI开发经验分享平台

## 项目简介

Recall Kit 是一个基于 MCP (Model Context Protocol) 协议的经验分享平台，旨在解决 AI 开发过程中重复对话和 token 浪费的问题。通过记录、分享和复用开发经验，让 AI Agent 能够自动查询和复用历史经验，提高开发效率。

### 📹 项目演示
WEB端访问地址（演示账号：comate/comate666）：http://www.codeva-cn.com:3100/

MCP配置（临时服务不太稳定）：
```jsonc
# 新版​Streamable HTTP
{
    "mcpServers": {
        "recall-kit": {
            "url": "http://www.codeva-cn.com:3101/mcp?api_key=rk_xxxx"
        }
    }
}
# 旧版HTTP+SSE transport配置
{
    "mcpServers": {
        "recall-kit": {
            "url": "http://www.codeva-cn.com:3101/sse?api_key=rk_xxxx"
        }
    }
}

# api_key可选，缺少时可查询不可提交经验
```

[观看项目演示视频](https://www.bilibili.com/video/BV1F3UnBjEfK?vd_source=6925f72b567b69e9d2d49ef7d6f1c711)

### 首页
![alt text](docs/dashboard.png)

### 使用Comate IDE开发过程

#### 📦 安装MCP

开发前，我们先来配置一下常用的两个MCP：`Supabase`和`Context7`，这两个工具这里不做过多介绍。在`Comate`中配置MCP也非常简单：展开AI侧边栏，点击右上角的MCP，在MCP市场搜索到添加就可以

![image.png](docs/mcp_install.png)
`Supabase`在MCP市场里找不到，没有关系，点击右上角手动配置，打开json文件，手动添加就可以了


![image.png](docs/mcp_json.png)

#### 🗂️ 文档生成

正常来说，配置好MCP后就可以直接对话`Zulu`智能体开始开发了。不过，针对这个MCP工具我还有一些想法，比如有个后台管理，还要有个搜索页面，几个加在一起就有些复杂了。针对这种复杂的项目，我习惯先使用`Spec Kit`工具先生成文档（包含项目章程、需求、设计、数据模型、任务拆分、验收清单等），生成后的文档如下：

![alt text](docs/spec-kit.png)

### 🤖 Zulu智能体启动

所有文档都生成之后，终于到我们的`Zulu`智能体发力了。可以看到我一口气将所有文档都塞了进去，`Zulu`阅读文档了解整个需求后，拆分了7个待办任务，并按照优先级逐个实现。

![alt text](docs/start.png)

整个Coding过程还是很出乎意料的，除了每实现一到两个任务需要我人工确认下一步，期间并没有什么问题，非常顺利的将整个项目的功能都实现了一遍。当然并不是说整个项目就这么开发好了，但基本上也有`60%~70%`的完成度了。

![alt text](docs/start2.png)

期间闹了个小乌龙，因为我对MCP了解的不够深入，以为MCP的client也需要开发，所以写在文档中了，其实这部分是不用开发的，浪费了不少的快速请求次数。

![alt text](docs/fix.png)

之后就是常见的启动 --> 运行 --> 报错 --> 修复 --> 再启动的开发流程了

![alt text](docs/debug.png)

### 🌟 点名表扬

开发期间最让我感到意外和好用的是这个功能，通过`Comate`内置的浏览器**可以直接选择页面元素，指哪改哪**，改起前端真是太好用了。这个功能也是我另一个项目灵感来源，这里就不展开说了。

![alt text](docs/like.png)

## 🧾 总结

简单做个使用总结，`Comate`的`Zulu`智能体整体使用下来的感觉很好，快速模式下响应速度很快，产出的代码质量也很高。赠送的50次快速请求要比我预想的更加耐用一些，开发一个小项目不成问题。整体来看，它仍旧是当前国内体验最能打的AI IDE之一。

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
