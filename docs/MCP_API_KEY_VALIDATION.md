# MCP API Key 验证改进

## 概述

根据 MCP 协议最佳实践，我们已经改进了 API key 验证机制，现在在建立连接时（initialize 请求阶段）就进行验证，而不是在后续请求中才验证。

## 改进内容

### 1. 连接时验证

在 `initialize` 请求阶段就验证 API key：
- 如果提供了 API key，会立即验证其有效性
- 验证失败时，直接返回错误，不允许建立连接
- 验证成功后，将验证结果存储在会话数据中

### 2. 会话存储

扩展了 `Session` 接口和 `SessionManager`：
- 支持在会话中存储额外数据
- API key 验证结果会存储在 `session.data.apiKeyValidation` 中
- 后续请求可以直接使用会话中存储的验证信息

### 3. 灵活验证

对于需要 API key 的操作（如 `submit_experience`）：
- 优先使用初始化时验证的 API key 信息
- 如果初始化时未提供 API key，仍然可以在后续请求中验证

## API Key 传递方式

支持以下几种方式传递 API key：

1. **Authorization Header（Bearer Token）**
   ```
   Authorization: Bearer <api-key>
   ```

2. **X-API-Key Header**
   ```
   X-API-Key: <api-key>
   ```

3. **API-Key Header**
   ```
   API-Key: <api-key>
   ```

## 错误处理

### 初始化阶段验证失败

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Invalid API key: authentication failed"
  }
}
```

### 后续请求中验证失败

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32000,
    "message": "API key required for submit_experience"
  }
}
```

## 使用示例

### 带有 API key 的初始化请求

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
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
  }'
```

### 后续请求（无需重复验证）

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Session-Id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "submit_experience",
      "arguments": {
        "title": "Test Experience",
        "problem_description": "Test problem",
        "solution": "Test solution"
      }
    }
  }'
```

## 日志记录

所有 API key 验证尝试都会被记录：
- 验证成功：记录 keyId、userId、IP 地址等
- 验证失败：记录失败原因、API key（脱敏）、IP 地址等

## 安全考虑

1. **传输安全**：生产环境必须使用 HTTPS
2. **Key 轮换**：定期更新 API key
3. **权限最小化**：API key 应只具有必要的权限
4. **速率限制**：考虑添加请求速率限制防止暴力破解

## 兼容性

- 完全向后兼容现有客户端
- 客户端可以选择在初始化时提供 API key，也可以在后续请求中提供
- 未提供 API key 时，仍可以使用不需要认证的功能

## 相关文件

- `mcp-server/src/mcp/mcpServer.ts` - 主要验证逻辑
- `mcp-server/src/mcp/sessionManager.ts` - 会话管理
- `mcp-server/src/mcp/types.ts` - 类型定义
- `mcp-server/src/services/apiKeyService.ts` - API key 验证服务
