# MCP Server 使用文档

## 目录
- [概述](#概述)
- [快速开始](#快速开始)
- [配置](#配置)
- [API 端点](#api-端点)
- [工具说明](#工具说明)
- [开发模式](#开发模式)
- [生产部署](#生产部署)
- [监控和日志](#监控和日志)

## 概述

MCP Server 是 Recall Kit 经验分享平台的服务器端实现，基于 Model Context Protocol (MCP) 规范，提供经验查询和提交功能。

### 主要特性

- ✅ 符合 MCP 2025-06-18 规范
- ✅ 支持 Streamable HTTP Transport
- ✅ 支持 Session 管理和 Resumability
- ✅ 自动工具注册和管理
- ✅ 完整的错误处理和日志记录
- ✅ 优雅关闭和资源清理

## 快速开始

### 1. 安装依赖

```bash
cd mcp-server
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# 服务器配置
PORT=3001
HOST=0.0.0.0

# CORS 配置（可选）
ALLOWED_ORIGINS=http://localhost:3000,https://example.com
```

### 3. 构建项目

```bash
npm run build
```

### 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 5. 验证运行

```bash
curl http://localhost:3001/health
```

应该返回：
```json
{
  "status": "ok"
}
```

## 配置

### 环境变量

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `SUPABASE_URL` | Supabase 项目 URL | ✅ | - |
| `SUPABASE_KEY` | Supabase 匿名密钥 | ✅ | - |
| `PORT` | 服务器端口 | ❌ | `3001` |
| `HOST` | 服务器主机 | ❌ | `0.0.0.0` |
| `ALLOWED_ORIGINS` | 允许的 CORS 源（逗号分隔） | ❌ | `*` |
| `MCP_QUERY_DEFAULT_LIMIT` | MCP 查询默认返回条数 | ❌ | `3` |
| `MCP_QUERY_MAX_LIMIT` | MCP 查询允许的最大条数 | ❌ | `100` |

### 配置文件示例

`.env`:
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3001
HOST=0.0.0.0

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com

# Query defaults
MCP_QUERY_DEFAULT_LIMIT=5
MCP_QUERY_MAX_LIMIT=50
```

## API 端点

### 1. Health Check

**GET** `/health`

检查服务器健康状态。

**响应：**
```json
{
  "status": "ok"
}
```

**示例：**
```bash
curl http://localhost:3001/health
```

### 2. MCP Protocol Endpoint

**POST** `/mcp`

MCP 协议的主要端点，处理所有 MCP 请求。

**请求头：**
- `Content-Type: application/json`
- `MCP-Session-Id` (可选): 会话 ID（首次请求不需要）
- `MCP-Protocol-Version` (可选): 协议版本

**请求体：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {
      "name": "client-name",
      "version": "1.0.0"
    }
  }
}
```

**响应：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "recall-kit-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

**响应头：**
- `Mcp-Session-Id`: 会话 ID（首次初始化时返回）

### 3. SSE Stream Endpoint

**GET** `/mcp`

建立 Server-Sent Events (SSE) 流，用于接收服务器推送的消息。

**请求头：**
- `MCP-Session-Id`: 会话 ID（必需）
- `Last-Event-ID` (可选): 用于恢复连接的事件 ID

**示例：**
```bash
curl -H "MCP-Session-Id: <session-id>" \
     -H "Accept: text/event-stream" \
     http://localhost:3001/mcp
```

### 4. Session Termination

**DELETE** `/mcp`

终止指定的会话。

**请求头：**
- `MCP-Session-Id`: 会话 ID（必需）

**示例：**
```bash
curl -X DELETE \
     -H "MCP-Session-Id: <session-id>" \
     http://localhost:3001/mcp
```

## API Key 认证

MCP Server 支持 API Key 认证机制。客户端可以在建立连接时提供 API Key，也可以在后续请求中提供。

### 认证方式

支持以下三种方式传递 API Key：

1. **Authorization Header (Bearer Token)**
   ```http
   Authorization: Bearer <api-key>
   ```

2. **X-API-Key Header**
   ```http
   X-API-Key: <api-key>
   ```

3. **API-Key Header**
   ```http
   API-Key: <api-key>
   ```

### 初始化时认证（推荐）

在 `initialize` 请求时提供 API Key，验证成功后会在整个会话中保持认证状态：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {
      "name": "test-client",
      "version": "1.0.0"
    }
  }
}
```

请求头示例：
```http
Content-Type: application/json
Authorization: Bearer your-api-key
```

### 错误处理

- **初始化时验证失败**：连接将被拒绝，返回错误信息
- **缺少必需的 API Key**：对于需要认证的操作，返回错误提示

### 认证范围

- `query_experiences`：无需认证，公开访问
- `submit_experience`：需要有效的 API Key

## 工具说明

### 1. query_experiences

查询经验记录。

**参数：**
```typescript
{
  keywords?: string[];      // 搜索关键词
  limit?: number;           // 结果数量 (1-100)，默认 3
  offset?: number;          // 分页偏移量，默认 0
  sort?: 'relevance' | 'query_count' | 'created_at';  // 排序方式
}
```

> 默认情况下服务器仅返回 3 条记录。要调整该默认值，可在 `.env` 中设置 `MCP_QUERY_DEFAULT_LIMIT`（如需限制最大值，可同时设置 `MCP_QUERY_MAX_LIMIT`，超出部分会被自动裁剪）。

**返回：**
```typescript
{
  experiences: Array<{
    id: string;
    title: string;
    problem_description: string;
    root_cause?: string;
    solution: string;
    context?: string;
    keywords: string[];
    query_count: number;
    relevance_score: number;
    created_at: string;
  }>;
  total_count: number;
  has_more: boolean;
}
```

**示例：**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "query_experiences",
    "arguments": {
      "keywords": ["typescript", "error"],
      "limit": 3,
      "sort": "relevance"
    }
  }
}
```

### 2. submit_experience

提交新的经验记录。

**参数：**
```typescript
{
  title: string;                    // 标题（必需）
  problem_description: string;      // 问题描述（必需）
  root_cause?: string;              // 根本原因（可选）
  solution: string;                 // 解决方案（必需）
  context?: string;                 // 上下文（可选）
  keywords?: string[];              // 关键词（可选）
}
```

**返回：**
```typescript
{
  experience_id: string;
  status: 'success' | 'failed';
  error?: string;
}
```

**示例：**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "submit_experience",
    "arguments": {
      "title": "TypeScript 类型错误处理",
      "problem_description": "遇到类型不匹配的问题",
      "solution": "使用类型断言或类型守卫",
      "keywords": ["typescript", "error"]
    }
  }
}
```

## 开发模式

### 启动开发服务器

```bash
npm run dev
```

开发模式特点：
- 自动监听文件变化并重启
- 详细的错误信息
- 热重载支持

### 代码结构

```
mcp-server/
├── src/
│   ├── index.ts              # 入口文件
│   ├── lib/
│   │   └── supabase.ts       # Supabase 客户端
│   ├── mcp/
│   │   ├── index.ts          # MCP 服务器初始化
│   │   ├── queryHandler.ts   # 查询处理器
│   │   └── submitHandler.ts  # 提交处理器
│   └── services/
│       ├── experienceService.ts  # 经验服务
│       └── rankingService.ts     # 排名服务
├── dist/                     # 编译输出
├── .env                      # 环境变量
└── package.json
```

## 生产部署

### 构建

```bash
npm run build
```

### 启动

```bash
npm start
```

### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start dist/index.js --name mcp-server

# 查看状态
pm2 status

# 查看日志
pm2 logs mcp-server

# 停止
pm2 stop mcp-server

# 重启
pm2 restart mcp-server
```

### 使用 Docker

创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

构建和运行：

```bash
docker build -t recall-kit-mcp-server .
docker run -p 3001:3001 \
  -e SUPABASE_URL=... \
  -e SUPABASE_KEY=... \
  recall-kit-mcp-server
```

### 使用 systemd

创建 `/etc/systemd/system/mcp-server.service`:

```ini
[Unit]
Description=Recall Kit MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production
EnvironmentFile=/opt/mcp-server/.env

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
sudo systemctl status mcp-server
```

## 监控和日志

### 日志输出

服务器会输出以下日志：

- 会话初始化：`Session initialized with ID: <session-id>`
- 会话关闭：`Session closed: <session-id>`
- 错误信息：`Error handling MCP request: <error>`
- 服务器启动：`MCP Server running on <host>:<port>`

### 健康检查

定期检查 `/health` 端点：

```bash
# 使用 curl
curl http://localhost:3001/health

# 使用监控工具
watch -n 5 'curl -s http://localhost:3001/health'
```

### 性能监控

建议使用以下工具监控服务器性能：

- **PM2**: `pm2 monit`
- **New Relic**: APM 监控
- **Datadog**: 应用性能监控
- **Prometheus + Grafana**: 自定义指标

## 故障排查

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   lsof -i :3001
   # 或
   netstat -tulpn | grep 3001
   ```

2. **Supabase 连接失败**
   - 检查 `SUPABASE_URL` 和 `SUPABASE_KEY` 是否正确
   - 检查网络连接
   - 查看 Supabase 项目状态

3. **CORS 错误**
   - 检查 `ALLOWED_ORIGINS` 配置
   - 确保客户端 Origin 在允许列表中

4. **Session 管理问题**
   - 检查日志中的 session ID
   - 确保客户端正确发送 `MCP-Session-Id` header

### 调试模式

设置环境变量启用详细日志：

```bash
DEBUG=* npm run dev
```

## 安全建议

1. **使用 HTTPS**：生产环境必须使用 HTTPS
2. **限制 CORS**：只允许必要的源
3. **环境变量保护**：不要将敏感信息提交到代码仓库
4. **速率限制**：考虑添加请求速率限制
5. **认证授权**：根据需要添加认证机制

## 更多信息

- [MCP Client 使用文档](./MCP_CLIENT_USAGE.md)
- [MCP Cursor 配置指南](./MCP_CURSOR_SETUP.md)

## Prompt 模板

### summarize_experience

- **作用**：将当前对话整理成符合 Recall Kit 模版的经验 Markdown 文件。
- **模板要点**：
  - 定义了“文档记录员”角色，要求收集标题/问题/根因/解决方案/上下文/关键词。
  - 明确指示客户端“Create a new log file in `specs/experiences/` to record the progress of the task.”
  - 提供完整 Markdown 模版，填写时先用 `<!-- example-start -->内容<!-- example-end -->` 包裹，完成后删除这些标记再输出最终文档。
- **推荐使用方式**：
  1. 通过 `prompts/get` 获取模板后执行。
  2. 按照提示填好所有字段（关键词至少 3 个，并包含相关技术栈）。
  3. 输出最终 Markdown，并提醒用户将其保存到 `specs/experiences/`，必要时建议文件名（如 `2025-11-14-title.md`）。

客户端可以通过 `prompts/list` 和 `prompts/get` 发现该模板，并在 Cursor 等 IDE 中以 Slash Command 或命令面板形式调用。
- [MCP Server 部署文档](./MCP_SERVER_DEPLOYMENT.md)
- [官方 MCP 规范](https://modelcontextprotocol.io/specification/2025-06-18)

