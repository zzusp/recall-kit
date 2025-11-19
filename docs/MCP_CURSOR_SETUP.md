# 在 Cursor 中配置 Recall Kit MCP Server

## 概述

本指南将帮助您在 Cursor IDE 中配置 Recall Kit MCP Server，使您能够在 Cursor 的 AI 助手中使用经验查询和提交功能。

## 前置条件

1. **MCP Server 已部署并运行**
   - 本地运行：`http://localhost:3001`
   - 或远程服务器：`https://your-server.com`

2. **Cursor IDE 已安装**
   - 确保使用支持 MCP 的 Cursor 版本

## 配置步骤

### 方法 1: 通过 Cursor 设置界面（推荐）

1. **打开 Cursor 设置**
   - 按 `Ctrl+,` (Windows/Linux) 或 `Cmd+,` (macOS)
   - 或点击菜单：`File > Preferences > Settings`

2. **搜索 MCP 设置**
   - 在设置搜索框中输入 "MCP" 或 "Model Context Protocol"

3. **添加 MCP Server**
   - 找到 "MCP Servers" 或类似选项
   - 点击 "Add Server" 或 "+" 按钮

4. **配置服务器信息**
   - **Name**: `recall-kit`（或您喜欢的名称）
   - **URL**: `http://localhost:3001/mcp`（本地）或 `https://your-server.com/mcp`（远程）

5. **保存配置**
   - 点击 "Save" 或 "Apply"
   - 重启 Cursor 使配置生效

### 方法 2: 直接编辑配置文件

#### 找到配置文件位置

**Windows**:
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

**macOS**:
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Linux**:
```
~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

#### 编辑配置文件

打开配置文件，添加以下内容：

```json
{
  "mcpServers": {
    "recall-kit": {
      "url": "http://localhost:3001/mcp",
      "description": "Recall Kit Experience Sharing Platform"
    }
  }
}
```

#### 保存并重启

1. 保存配置文件
2. 完全关闭并重启 Cursor

## 配置示例

### 本地开发配置

```json
{
  "mcpServers": {
    "recall-kit": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### 远程服务器配置

```json
{
  "mcpServers": {
    "recall-kit": {
      "url": "https://api.example.com/mcp",
      "description": "Recall Kit Production Server"
    }
  }
}
```

### 多服务器配置

```json
{
  "mcpServers": {
    "recall-kit": {
      "url": "http://localhost:3001/mcp",
      "description": "Recall Kit Experience Sharing Platform"
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

## 验证配置

### 1. 检查服务器状态

在终端中运行：

```bash
curl http://localhost:3001/health
```

应该返回：
```json
{
  "status": "ok"
}
```

### 2. 在 Cursor 中测试

1. **打开 Cursor 的 AI 聊天界面**
   - 按 `Ctrl+L` (Windows/Linux) 或 `Cmd+L` (macOS)

2. **测试工具调用**
   
   在聊天中输入：
   ```
   请使用 query_experiences 工具查询关于 "typescript" 的经验，限制返回 5 条结果
   ```

3. **检查响应**
   - 如果配置正确，AI 应该能够调用工具并返回经验列表
   - 如果失败，查看错误消息

### 3. 查看可用工具

在 Cursor 中，您可以：
- 查看 MCP 服务器连接状态
- 查看可用的工具列表
- 查看工具的使用说明

## 使用示例

### 查询经验

在 Cursor 的 AI 聊天中：

```
请帮我查询关于 "react hooks" 的开发经验，返回最相关的 10 条
```

AI 会调用 `query_experiences` 工具并返回结果。

### 提交经验

在 Cursor 的 AI 聊天中：

```
我想提交一条经验：
- 标题：React useEffect 依赖项问题
- 问题：useEffect 无限循环
- 解决方案：正确设置依赖项数组
- 关键词：react, hooks, useEffect
```

AI 会调用 `submit_experience` 工具提交经验。

### 生成 Markdown 并保存到本地

当需要把当前对话整理成经验文档时，直接在聊天中运行 prompt：

```
/recall-kit/summarize_experience
```

或自然语言描述：“请用 recall-kit 模板总结当前对话经验并写入 specs/experiences。”

Prompt 会：

1. 设定“文档记录员”角色，自动提取标题/问题/根因/解决方案/上下文/关键词（关键词至少 3 个）。
2. 提供带有 `<!-- example-start -->...<!-- example-end -->` 标记的 Markdown 模板，指导 AI 填写。
3. 明确提示：“Create a new log file in `specs/experiences/` to record the progress of the task.”，并建议文件名（如 `2025-11-14-title.md`）。
4. 由客户端将生成的 Markdown 写入该目录（Cursor 会提示写入权限，点击同意即可）。

### 结合代码上下文

```
我正在处理这段代码中的错误：
[粘贴代码]

请查询类似问题的解决方案，并帮我修复
```

AI 会：
1. 分析代码问题
2. 使用 `query_experiences` 查询相关经验
3. 根据经验提供解决方案

## 故障排查

### 问题 1: 无法连接到服务器

**症状**: Cursor 显示连接失败

**解决方案**:
1. 检查服务器是否运行：
   ```bash
   curl http://localhost:3001/health
   ```

2. 检查 URL 配置是否正确（包括 `/mcp` 路径）

3. 检查防火墙设置

4. 查看服务器日志

### 问题 2: 工具不可用

**症状**: 在 Cursor 中看不到工具

**解决方案**:
1. 重启 Cursor

2. 检查服务器日志，确认工具已注册

3. 手动测试工具：
   ```bash
   curl -X POST http://localhost:3001/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/list"
     }'
   ```

### 问题 3: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:
1. 确保 MCP Server 的 `ALLOWED_ORIGINS` 配置正确

2. 对于本地开发，可以在服务器配置中允许所有源：
   ```env
   ALLOWED_ORIGINS=*
   ```

### 问题 4: 配置文件找不到

**症状**: 找不到配置文件位置

**解决方案**:
1. 使用 Cursor 的命令面板（`Ctrl+Shift+P`）搜索 "MCP"

2. 手动创建配置目录和文件

3. 参考 Cursor 官方文档

## 高级配置

### 使用环境变量

某些配置可能支持环境变量：

```bash
export MCP_SERVER_URL=http://localhost:3001/mcp
```

### 自定义查询返回数量

如果希望 `query_experiences` 工具默认返回的条目数不同，可以在 MCP Server 所在的 `.env` 中调整：

```env
MCP_QUERY_DEFAULT_LIMIT=3   # 默认返回 3 条
MCP_QUERY_MAX_LIMIT=50      # （可选）允许的最大条数
```

修改后重启 MCP Server 即可生效。

### Prompt 模板

服务器内置 `summarize_experience` prompt，可在 Cursor 命令面板或 Slash 命令中直接输入 `/recall-kit/summarize_experience` 调用。它会：

1. 指定“Recall Kit 文档记录员”角色；
2. 列出详细步骤，强调需要创建 `specs/experiences/` 下的新日志文件；
3. 给出包含 `<!-- example-start -->` / `<!-- example-end -->` 的 Markdown 模板，要求先用标记包裹草稿内容，填完后删除标记再输出最终 Markdown。

这样即使没有专门的工具，也能保证输出内容结构一致、存档路径统一。

### 自定义工具描述

在配置文件中添加工具描述：

```json
{
  "mcpServers": {
    "recall-kit": {
      "url": "http://localhost:3001/mcp",
      "description": "Recall Kit - 经验分享平台",
      "tools": {
        "query_experiences": {
          "description": "查询开发经验"
        },
        "submit_experience": {
          "description": "提交新经验"
        }
      }
    }
  }
}
```

## 最佳实践

1. **使用 HTTPS（生产环境）**
   - 确保远程服务器使用 HTTPS
   - 配置有效的 SSL 证书

2. **定期更新**
   - 保持 MCP Server 更新到最新版本
   - 关注安全更新

3. **监控连接**
   - 定期检查服务器健康状态
   - 查看服务器日志

4. **备份配置**
   - 备份 Cursor 配置文件
   - 使用版本控制管理配置（如果可能）

## 相关文档

- [MCP Server 使用文档](./MCP_SERVER_USAGE.md)
- [MCP Server 部署文档](./MCP_SERVER_DEPLOYMENT.md)
- [MCP Client 使用文档](./MCP_CLIENT_USAGE.md) - 用于代码中集成

## 获取帮助

- 查看服务器日志
- 检查 Cursor 的 MCP 状态
- 提交 Issue 到 GitHub
- 联系技术支持

