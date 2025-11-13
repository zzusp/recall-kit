# MCP Client Protocol

**Version**: 1.0.0  
**Purpose**: MCP Client与Agent和MCP Server之间的通信协议

## Overview

MCP Client是安装在Agent端的客户端，负责：
1. 分析Agent的需求，转换为MCP Server查询请求
2. 解析MCP Server返回的结果，格式化后返回给Agent
3. 总结Agent与用户的交互经验
4. 对代码片段进行自动脱敏处理
5. 提示用户确认后提交经验

## Client Architecture

```
Agent
  ↓ (自然语言请求)
MCP Client
  ├── Query Service (查询服务)
  │   ├── 需求分析
  │   ├── 查询格式化
  │   └── 结果解析
  ├── Submit Service (提交服务)
  │   ├── 经验总结
  │   ├── 代码脱敏
  │   └── 用户确认
  └── Summary Service (总结服务)
      └── AI经验总结
  ↓ (MCP协议)
MCP Server
```

## Query Flow (查询流程)

### 1. Agent发起查询

Agent通过自然语言描述需求：
```
"用户遇到了React useState不更新的问题"
```

### 2. MCP Client处理

**需求分析**:
- 提取关键词：["React", "useState", "不更新"]
- 识别问题类型：状态管理问题
- 生成查询请求

**查询格式化**:
```typescript
{
  keywords: "React useState not updating",
  limit: 10,
  offset: 0
}
```

### 3. 调用MCP Server

使用MCP协议调用`query_experiences`工具。

### 4. 解析结果

**结果解析**:
- 提取经验记录
- 格式化返回给Agent

**返回格式**:
```typescript
{
  found: boolean;
  count: number;
  experiences: FormattedExperience[];
}

interface FormattedExperience {
  title: string;
  problem: string;
  solution: string;
  code?: string;
  keywords: string[];
  relevance: number;
}
```

## Submit Flow (提交流程)

### 1. Agent检测到问题解决

Agent识别到用户问题已解决，准备总结经验。

### 2. MCP Client总结经验

**经验总结**（使用AI服务）:
- 提取问题描述
- 提取解决方案
- 提取上下文信息
- 提取代码片段（如有），包含在context字段中

**总结格式**:
```typescript
{
  title: string;
  problem_description: string;
  root_cause?: string;
  solution: string;
  context?: string;  // 包含代码片段（需脱敏）
}
```

### 3. 代码脱敏处理

如果context字段包含代码片段，必须进行脱敏处理：

**脱敏规则**:
1. 移除API密钥、密码、token等敏感信息
2. 变量名匿名化（如：`apiKey` → `var_001`）
3. 移除硬编码的URL和IP地址
4. 移除个人信息（邮箱、用户名等）

**脱敏示例**:
```javascript
// 原始代码
const apiKey = "sk-1234567890";
fetch("https://api.example.com/data", {
  headers: { "Authorization": `Bearer ${apiKey}` }
});

// 脱敏后
const apiKey = "YOUR_API_KEY";
fetch("https://api.example.com/data", {
  headers: { "Authorization": `Bearer ${apiKey}` }
});
```

脱敏后的代码片段应包含在context字段中。

### 4. 用户确认

**确认提示**:
```
检测到您刚刚解决了一个问题，是否要保存这次经验？

标题: React useState not updating state
问题: State variable not updating after setState call
解决方案: Use functional update form

[确认] [取消] [编辑]
```

### 5. 提交到MCP Server

用户确认后，调用`submit_experience`工具提交。

## Configuration

MCP Client配置文件（`recall-kit-client.config.json`）:

```json
{
  "server": {
    "url": "mcp://recall-kit-server",
    "timeout": 5000
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "YOUR_API_KEY"
  },
  "sanitizer": {
    "enabled": true,
    "rules": [
      "remove_api_keys",
      "anonymize_variables",
      "remove_urls"
    ]
  },
  "autoSubmit": false,
  "promptOnSubmit": true
}
```

## Installation

### NPM Package

```bash
npm install -g @recall-kit/mcp-client
```

### Configuration

```bash
recall-kit-client init
```

### Integration with Agent

```typescript
import { RecallKitClient } from '@recall-kit/mcp-client';

const client = new RecallKitClient({
  serverUrl: 'mcp://recall-kit-server',
  configPath: './recall-kit-client.config.json'
});

// 查询经验
const results = await client.query({
  keywords: "React useState not updating"
});

// 提交经验（需要用户确认）
await client.submitExperience({
  title: "...",
  problem_description: "...",
  solution: "..."
});
```

## Error Handling

MCP Client处理以下错误情况：

1. **网络错误**: 自动重试3次，每次间隔1秒
2. **超时错误**: 返回超时提示，建议检查网络
3. **验证错误**: 显示具体验证错误，允许用户修改
4. **服务器错误**: 记录错误日志，提示稍后重试

## User Interaction

### 查询时

- 静默查询，不打断用户工作流
- 仅在找到相关经验时提示Agent

### 提交时

- 必须用户确认
- 提供编辑选项
- 显示context字段中的内容（包含脱敏后的代码片段，如有）

## Performance

- 查询响应时间：< 2秒（90%）
- 经验总结时间：< 5秒
- 代码脱敏时间：< 1秒

