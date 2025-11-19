# MCP Server 日志系统使用指南

## 概述

MCP Server 现在配备了完整的结构化日志系统，基于 Winston 实现，提供详细的连接、方法和操作日志记录。

## 功能特性

### ✅ 已实现的日志功能

1. **服务生命周期日志**
   - 服务启动和就绪状态
   - 服务关闭和清理过程
   - 配置信息记录

2. **连接管理日志**
   - SSE 连接建立和关闭
   - Streamable HTTP 连接管理
   - 会话初始化和终止
   - 连接时间统计

3. **API 请求日志**
   - 所有 HTTP 请求记录
   - 响应时间和状态码
   - 请求头和参数记录
   - 错误请求追踪

4. **工具调用日志**
   - 工具调用开始和完成
   - 调用参数和结果记录
   - 错误和异常处理
   - 执行时间统计

5. **安全日志**
   - API 密钥验证
   - 敏感信息脱敏
   - 用户代理和IP记录

## 日志级别

| 级别 | 用途 | 示例 |
|------|------|------|
| `error` | 错误和异常 | 工具调用失败、连接错误 |
| `warn` | 警告信息 | 无效请求、配置问题 |
| `info` | 重要事件 | 连接建立、服务启动 |
| `debug` | 调试信息 | 详细执行流程 |

## 配置选项

### 环境变量

```bash
# 日志级别 (error, warn, info, debug)
LOG_LEVEL=info

# 运行环境 (影响日志格式)
NODE_ENV=development

# 日志文件大小限制 (字节)
LOG_MAX_SIZE=5242880

# 日志文件保留数量
LOG_MAX_FILES=5
```

### 日志文件位置

- `logs/combined.log` - 所有日志
- `logs/error.log` - 仅错误日志
- `logs/exceptions.log` - 未捕获异常
- `logs/rejections.log` - Promise 拒绝

## 日志格式

### 开发环境 (彩色输出)
```
20:23:48.190 info: MCP Server starting
  Context: {
    "service": "recall-kit-mcp-server",
    "version": "1.0.0",
    "event": "service_start",
    "port": 3001,
    "host": "0.0.0.0"
  }
```

### 生产环境 (结构化JSON)
```json
{
  "timestamp": "2025-11-19 20:23:48.183",
  "level": "info",
  "message": "MCP Server starting",
  "service": "recall-kit-mcp-server",
  "version": "1.0.0",
  "event": "service_start",
  "port": 3001,
  "host": "0.0.0.0"
}
```

## 关键日志事件

### 连接事件
```json
{
  "event": "connection_success",
  "sessionId": "a26bfc97-361b-4c50-b247-6d1e9e014143",
  "transportType": "sse",
  "connectionTime": 35,
  "hasApiKey": true
}
```

### 工具调用事件
```json
{
  "event": "tool_call_start",
  "toolName": "query_experiences",
  "args": {"keywords": ["test"], "limit": 5},
  "sessionId": "a26bfc97-361b-4c50-b247-6d1e9e014143"
}
```

### API 请求事件
```json
{
  "event": "api_request",
  "method": "GET",
  "url": "/health",
  "requestId": "0743932e",
  "headers": {"host": "127.0.0.1:3001"}
}
```

## 安全特性

1. **敏感信息脱敏**
   - API 密钥只显示前8位
   - 密码字段替换为 `***`
   - Token 信息完全隐藏

2. **请求ID追踪**
   - 每个请求分配唯一ID
   - 支持跨请求追踪
   - 便于问题定位

3. **结构化存储**
   - JSON 格式便于分析
   - 支持日志聚合工具
   - 时间戳标准化

## 使用示例

### 启动服务器
```bash
cd mcp-server
npm run dev
```

### 查看实时日志
```bash
# 开发环境 - 彩色输出
npm run dev

# 生产环境 - 文件输出
tail -f logs/combined.log
```

### 过滤特定事件
```bash
# 查看连接日志
grep "connection_success" logs/combined.log

# 查看工具调用
grep "tool_call" logs/combined.log

# 查看错误日志
grep "error" logs/error.log
```

## 性能考虑

1. **异步记录** - 日志写入不阻塞主要业务流程
2. **批量操作** - 减少I/O操作
3. **文件轮转** - 防止日志文件过大
4. **可配置级别** - 生产环境可减少详细日志

## 故障排查

### 常见问题

1. **日志文件未生成**
   ```bash
   # 检查权限和目录
   ls -la logs/
   mkdir -p logs/
   ```

2. **日志级别过高**
   ```bash
   # 调整环境变量
   export LOG_LEVEL=debug
   ```

3. **磁盘空间不足**
   ```bash
   # 清理旧日志
   find logs/ -name "*.log" -mtime +7 -delete
   ```

### 日志分析工具

推荐使用以下工具分析日志：

1. **ELK Stack** - Elasticsearch + Logstash + Kibana
2. **Grafana Loki** - 轻量级日志聚合
3. **Fluentd** - 日志收集和转发
4. **jq** - JSON 日志处理
   ```bash
   cat logs/combined.log | jq '.event == "tool_call_start"'
   ```

## 测试

运行日志功能测试：

```bash
cd mcp-server
node test-logging-implementation.js
```

测试脚本会验证：
- ✓ HTTP 请求日志记录
- ✓ SSE 连接日志
- ✓ 工具调用日志
- ✓ 响应时间统计
- ✓ 错误处理日志

## 最佳实践

1. **生产环境配置**
   ```bash
   LOG_LEVEL=warn
   NODE_ENV=production
   LOG_MAX_SIZE=10485760  # 10MB
   LOG_MAX_FILES=10
   ```

2. **监控告警**
   - 监控错误日志频率
   - 设置磁盘空间告警
   - 连接失败率监控

3. **日志保留策略**
   - 开发环境：保留7天
   - 测试环境：保留30天
   - 生产环境：保留90天

## 扩展功能

未来可以考虑添加：

1. **远程日志发送** - 发送到日志中心
2. **实时监控** - WebSocket 实时日志流
3. **日志分析** - 内置统计分析
4. **告警机制** - 自动异常检测
5. **性能指标** - 详细性能监控

## 支持

如有问题，请检查：

1. 日志文件权限
2. 环境变量配置
3. 磁盘空间
4. 日志级别设置

更多技术细节请参考 `src/services/loggerService.ts` 源代码。
