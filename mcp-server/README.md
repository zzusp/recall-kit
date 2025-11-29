# Recall Kit MCP Server

## 简介

Recall Kit MCP Server 是基于 Model Context Protocol (MCP) 的服务器，为 AI Agent 提供经验查询和提交服务。通过 MCP 协议，Agent 可以自动查询相关经验记录，或提交新的经验到平台。

## 功能特性

### MCP Tools

1. **query_experiences** - 查询经验记录
   - 支持关键词搜索
   - 支持 ID 列表查询
   - 支持向量搜索和全文搜索
   - 可配置返回数量、排序方式等

2. **submit_experience** - 提交新经验
   - 自动生成关键字
   - 自动生成 embedding（如果配置了 OpenAI API，也可以对接免费的第三方向量模型，当然免费的效果差点儿）
   - 数据验证和脱敏检查
   - 自动发布经验记录

### MCP Prompts

1. **summarize_experience** - 总结对话为经验记录
   - 从对话中提取经验信息
   - 智能合并或拆分多个问题
   - 生成标准化的 Markdown 文档
   - 保存到 `specs/experiences/` 目录，经用户确认修改（如过滤敏感信息、调整关键字等）后，可手动提交到平台（示例：提交文档`@specs/experiences/xxx.md`到经验）

### 核心能力

- ✅ **MCP 协议支持** - 完全兼容 MCP 2025-06-18 协议
- ✅ **HTTP 传输** - 使用 StreamableHTTPServerTransport
- ✅ **会话管理** - 支持多客户端并发连接
- ✅ **数据验证** - 使用 Zod 进行严格的输入验证
- ✅ **错误处理** - 完善的错误处理和日志记录

## 技术栈

- **框架**: Model Context Protocol SDK (@modelcontextprotocol/sdk)
- **语言**: TypeScript 5.3+
- **运行时**: Node.js 18+
- **HTTP 服务器**: Express
- **数据验证**: Zod
- **开发工具**: tsx (开发时热重载)

## 项目结构

```
mcp-server/
├── src/
│   ├── mcp/                  # MCP 协议相关
│   │   ├── index.ts          # MCP 初始化
│   │   ├── queryHandler.ts   # 查询处理器
│   │   ├── submitHandler.ts  # 提交处理器
│   │   ├── sessionManager.ts # 会话管理
│   │   ├── config.ts         # 配置管理
│   │   └── types.ts          # MCP 类型定义
│   └── types/                # TypeScript 类型定义
├── dist/                     # 编译输出目录
├── tsconfig.json             # TypeScript 配置
└── package.json              # 依赖配置
```

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- OpenAI API Key（可选，用于向量搜索）

### 安装

```bash
# 安装依赖
npm install
```

### 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# OpenAI 配置（用于向量搜索，可选）
OPENAI_API_KEY=your-openai-api-key

# 服务器配置
PORT=3001                    # 服务器端口（默认：3001）
HOST=0.0.0.0                # 监听地址（默认：0.0.0.0）
ALLOWED_ORIGINS=*           # 允许的 CORS 来源（默认：*）

# MCP 配置（可选，使用默认值）
QUERY_DEFAULT_LIMIT=10      # 默认查询数量
QUERY_MAX_LIMIT=50          # 最大查询数量
```

### 开发

```bash
# 启动开发服务器（热重载）
npm run dev

# 服务器将在 http://localhost:3001 运行
# MCP 协议端点: http://localhost:3001/mcp
```

### 构建和运行

```bash
# 编译 TypeScript
npm run build

# 运行编译后的代码
npm start
```

## 开发命令

```bash
npm run dev          # 开发模式（tsx watch，热重载）
npm run build        # 编译 TypeScript 到 dist/
npm run start        # 运行编译后的代码
npm run lint         # 运行 ESLint 检查
npm test             # 运行测试
npm run test:watch   # 监听模式运行测试
npm run test:coverage # 生成测试覆盖率报告
```

## MCP 协议端点

### 端点信息

- **URL**: `http://localhost:3001/mcp`
- **协议版本**: `2025-06-18`
- **传输方式**: HTTP SSE (Server-Sent Events)
- **内容类型**: `application/json`

### 支持的 Tools

#### 1. query_experiences

查询经验记录。

**输入参数**:
```typescript
{
  keywords?: string[];      // 关键词数组（可选）
  ids?: string[];           // 经验 ID 数组（可选）
  limit?: number;           // 返回数量（1-50，默认：10）
  offset?: number;          // 偏移量（默认：0）
  sort?: 'relevance' | 'query_count' | 'created_at';  // 排序方式（默认：relevance）
}
```

**返回结果**:
```typescript
{
  experiences: ExperienceRecord[];  // 经验记录数组
  totalCount: number;                // 总数量
  hasMore: boolean;                 // 是否有更多结果
}
```

#### 2. submit_experience

提交新经验记录。

**输入参数**:
```typescript
{
  title: string;                    // 标题（必填）
  problem_description: string;      // 问题描述（必填）
  root_cause?: string;              // 根本原因（可选）
  solution: string;                 // 解决方案（必填）
  context?: string;                 // 上下文信息（可选）
  keywords: string[];                // 关键字数组（必填，至少3个）
}
```

**返回结果**:
```typescript
{
  experience_id: string;    // 新创建的经验记录 ID
  status: 'success' | 'failed';  // 状态
  publish_status?: 'published' | 'draft';  // 发布状态（成功时返回 'published'）
  error?: string;           // 错误信息（如有）
}
```

**注意**: 通过此工具提交的经验记录将自动保存为**已发布**状态（`published`），而不是草稿状态（`draft`）。经验提交后即可在后台管理界面查看，并且会被向量化用于语义搜索。

### 支持的 Prompts

#### summarize_experience

引导 AI 将当前对话总结成 Recall Kit 经验记录的提示词。该 prompt 会指导模型：

1. **提取经验信息** - 从对话中提取标题、问题描述、根本原因、解决方案、上下文和关键字
2. **智能合并** - 如果对话中有多个已解决的问题，判断解决方案是否相同，相同则合并，不同则拆分
3. **生成 Markdown** - 按照模板生成结构化的 Markdown 文档
4. **保存文件** - 将生成的文档保存到 `specs/experiences/` 目录

**使用场景**:
- Agent 成功解决一个问题后，使用此 prompt 引导用户总结经验
- 将对话历史转换为可复用的经验记录
- 生成标准化的经验文档格式

**生成的文档结构**:
```markdown
---
title: "标题"
generated_at: YYYY-MM-DDTHH:MM:SSZ
keywords:
  - keyword-1
  - keyword-2
  - keyword-3
---

## Problem Description
问题描述

## Root Cause
根本原因

## Solution
解决方案

## Context
上下文信息

## Lessons Learned (Will not be submitted)
经验总结/反思

## References (Will not be submitted)
参考链接或代码
```

#### submit_doc_experience

将已存在的经验文档提交到 Recall Kit 平台的提示词。该 prompt 会指导模型：

1. **文档验证** - 检查文档是否遵循所需的模板结构
2. **参数提取** - 从文档中提取所有必需的字段
3. **直接提交** - 不对内容进行任何处理或总结，原样提交
4. **结果展示** - 向用户显示提交结果

**使用场景**:
- 提交通过 `summarize_experience` 生成的经验文档
- 批量提交已有的经验文档到平台
- 提交用户手动编写的符合模板的经验文档

**必需的文档结构**:
```markdown
---
title: "描述性标题"
generated_at: YYYY-MM-DDTHH:MM:SSZ
keywords:
  - keyword1
  - keyword2
  - keyword3
---

## Problem Description
[问题描述内容]

## Root Cause
[根本原因内容]

## Solution
[解决方案内容]

## Context
[上下文信息内容]
```

**工作流程**:
1. 检查用户是否提供了文档路径
2. 如果未提供，询问用户指定经验文档的路径
3. 读取文档并验证其符合模板结构
4. 如果验证失败，提供具体的修改建议
5. 如果验证通过，提取参数并调用 `submit_experience` 工具
6. 显示提交结果给用户

**重要提示**: 此 prompt 不会对文档内容进行任何修改或总结，会原样提取并提交文档中的内容。

## MCP 核心功能

### 查询和提交

- **查询经验记录**: 支持关键词搜索和ID查询
- **提交新经验**: 支持创建新的经验记录
- **数据验证**: 严格的输入验证和格式检查

## 配置说明

### MCP 服务器配置

配置通过环境变量和 `src/mcp/config.ts` 管理：

- `QUERY_DEFAULT_LIMIT`: 默认查询数量（默认：10）
- `QUERY_MAX_LIMIT`: 最大查询数量（默认：50）
- `ALLOWED_ORIGINS`: CORS 允许的来源（默认：*）


## 会话管理

MCP Server 支持多客户端并发连接：

- 每个客户端连接创建独立的会话
- 会话 ID 自动生成（UUID）
- 支持会话级别的资源管理
- 优雅关闭时会清理所有会话资源


## 错误处理

MCP Server 提供完善的错误处理：

- **输入验证错误** - 使用 Zod 进行验证，返回清晰的错误信息
- **数据库错误** - 捕获并记录数据库操作错误
- **网络错误** - 处理网络连接问题
- **业务逻辑错误** - 返回有意义的错误消息

## 日志记录

服务器会记录以下信息：

- 服务器启动和关闭
- MCP 协议请求和响应
- 错误和异常
- 会话创建和销毁

## 部署

### 生产环境部署

1. **构建项目**
```bash
npm run build
```

2. **设置环境变量**
确保所有必需的环境变量已配置。

3. **启动服务器**
```bash
npm start
```

### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name recall-kit-mcp-server

# 查看日志
pm2 logs recall-kit-mcp-server

# 重启应用
pm2 restart recall-kit-mcp-server
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### 环境变量检查

部署前确保以下环境变量已设置：
- `OPENAI_API_KEY`（可选，用于向量搜索）
- `PORT`（可选，默认 3001）
- `HOST`（可选，默认 0.0.0.0）

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 故障排查

### 常见问题

1. **MCP 客户端连接失败**
   - 检查服务器是否正在运行
   - 确认端口是否正确（默认 3001）
   - 检查 CORS 配置

2. **向量搜索不工作**
   - 检查 OpenAI API Key 是否配置
   - 确认数据库迁移已执行
   - 检查 embedding 数据是否存在

3. **工具调用失败**
   - 检查输入参数格式
   - 查看服务器日志
   - 确认服务正常运行

4. **工具调用失败**
   - 检查输入参数格式
   - 查看服务器日志
   - 确认数据库表结构正确

## 开发注意事项

### TypeScript

- 所有代码使用 TypeScript 编写
- 类型定义位于 `src/types/` 目录

### 代码规范

- 使用 ESLint 和 Prettier 进行代码格式化
- 提交前运行 `npm run lint`
- 遵循 MCP 协议规范

### 性能优化

- 异步处理长时间运行的任务
- 适当的错误处理和日志记录

## 相关文档

- [项目根目录 README](../README.md)
- [MCP Server 使用说明](../docs/MCP_SERVER_USAGE.md)
- [向量搜索指南](../docs/VECTOR_SEARCH.md)
- [MCP 协议文档](https://modelcontextprotocol.io)

## 许可证

查看项目根目录的 [LICENSE](../LICENSE) 文件。

