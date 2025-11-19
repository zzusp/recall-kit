# MCP Server 日志记录功能实现

## 概述

本文档描述了在recall-kit MCP服务器中实现的日志记录功能，包括查询操作、提交操作和API密钥验证的详细日志记录。

## 实现的功能

### 1. 查询日志记录
- 记录所有查询操作的详细信息
- 包含查询关键词、结果数量、响应时间
- 关联API密钥ID、用户ID和会话ID
- 异步记录，不影响查询性能

### 2. 提交日志记录
- 记录所有提交操作的状态（成功/失败/验证错误）
- 包含错误信息和验证错误的详细信息
- 关联经验ID、标题和问题描述
- 支持API密钥验证失败的情况记录

### 3. API密钥验证日志
- 记录所有API密钥验证尝试（成功和失败）
- 包含失败原因（无密钥、格式错误、无效密钥等）
- 记录IP地址和用户代理信息
- 仅记录密钥前缀，确保安全性

## 数据库表结构

### 1. api_key_validation_logs (新增)
```sql
CREATE TABLE IF NOT EXISTS api_key_validation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    api_key_prefix VARCHAR(20),
    validation_result VARCHAR(20) NOT NULL, -- 'success' or 'failed'
    failure_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. query_logs (扩展)
添加了以下字段：
- `api_key_id` - 关联API密钥
- `user_id` - 关联用户
- `session_id` - 会话ID

- `api_key_id` - 关联API密钥
- `user_id` - 关联用户
- `session_id` - 会话ID
- `title` - 经验标题
- `problem_description` - 问题描述

## 核心文件修改

### 1. 新增文件

#### src/services/logService.ts
- 统一的日志记录服务
- 提供查询、提交和API密钥验证的日志记录方法
- 异步记录，不影响主要业务流程

#### migrations/010_add_logging_tables.sql
- 数据库迁移脚本
- 创建新的日志表
- 为现有表添加新字段和索引

### 2. 修改文件

#### src/mcp/queryHandler.ts
- 添加`QueryContext`接口
- 修改`queryHandler`函数支持context参数
- 集成查询日志记录
- 计算并记录响应时间

#### src/mcp/submitHandler.ts
- 添加`SubmitContext`接口
- 修改`submitHandler`函数支持context参数
- 集成提交日志记录
- 详细记录验证错误和失败情况

#### src/mcp/mcpServer.ts
- 添加API密钥验证逻辑
- 在提交操作中强制要求API密钥
- 集成API密钥验证日志记录
- 从请求头中提取API密钥

#### src/services/experienceService.ts (新创建)
- 完整的经验记录服务实现
- 支持查询、创建和更新经验记录
- 处理关键词关联

#### src/services/rankingService.ts (新创建)
- 相关性评分服务
- 根据关键词更新经验记录的相关性分数
- 支持批量更新

## 使用方式

### 1. 查询操作日志
查询操作会自动记录以下信息：
```typescript
{
  queryKeywords: string[],
  resultCount: number,
  responseTimeMs: number,
  experienceIds: string[],
  querySource: string,
  apiKeyId?: string,
  userId?: string,
  sessionId?: string
}
```

### 2. 提交操作日志
提交操作会自动记录以下信息：
```typescript
{
  experienceId?: string,
  submissionStatus: 'success' | 'failed' | 'validation_error',
  errorMessage?: string,
  validationErrors?: any,
  apiKeyId?: string,
  userId?: string,
  sessionId?: string,
  title?: string,
  problemDescription?: string
}
```

### 3. API密钥验证日志
API密钥验证会自动记录：
```typescript
// 成功验证
{
  api_key_id: string,
  user_id: string,
  validation_result: 'success',
  ip_address?: string,
  user_agent?: string,
  session_id?: string
}

// 失败验证
{
  api_key_prefix: string,
  validation_result: 'failed',
  failure_reason: string,
  ip_address?: string,
  user_agent?: string,
  session_id?: string
}
```

## 安全考虑

1. **API密钥安全**：只记录API密钥的前缀，不记录完整密钥
2. **敏感信息过滤**：不记录请求体的完整内容，只记录关键字段
3. **异步记录**：所有日志记录都是异步进行，不影响主要业务性能
4. **错误处理**：日志记录失败不会影响主要业务流程

## 性能优化

1. **索引优化**：为日志表的关键查询字段创建了索引
2. **批量操作**：支持批量更新查询计数和相关性分数
3. **异步处理**：使用`setImmediate`确保日志记录不阻塞响应
4. **连接池**：复用数据库连接，减少连接开销

## 测试

运行测试脚本验证日志功能：
```bash
cd mcp-server
node test-logging.js
```

## 部署注意事项

1. 运行数据库迁移脚本：
```bash
psql -d your_database -f migrations/010_add_logging_tables.sql
```

2. 确保环境变量正确配置，特别是数据库连接信息

3. 监控日志表的大小，定期清理旧日志以避免性能问题

## 未来扩展

1. **日志分析**：可以添加日志分析功能，生成使用统计报告
2. **实时监控**：可以实现实时日志监控和告警
3. **日志导出**：可以添加日志导出功能，支持CSV或JSON格式
4. **性能监控**：可以集成APM工具进行更详细的性能监控
