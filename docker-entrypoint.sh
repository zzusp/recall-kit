#!/bin/sh
set -e

# 在后台启动 MCP 服务器（使用 PORT=3001）
echo "Starting MCP server in background on port 3001..."
PORT=3001 node ./mcp/index.js > ./mcp/mcp_server.log 2>&1 &

# 等待一下确保 MCP 服务器启动
sleep 2

# 在前台启动 Web 服务器（使用 PORT=3100，保持容器运行）
echo "Starting Web server on port 3000..."
PORT=3000 exec node ./web/server.js --port 3000 --hostname 127.0.0.1

