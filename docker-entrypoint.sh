#!/bin/sh
set -e

# 环境变量配置说明：
# - NEXTAUTH_SECRET: NextAuth.js 的密钥，必须设置（至少32个字符）
# - NEXT_PUBLIC_APP_URL: 应用的完整URL，用于判断是否使用HTTPS（影响cookie secure标志）
#   例如：http://www.codeva-cn.com:3100 或 https://www.codeva-cn.com
# - COOKIE_SECURE: 强制设置cookie的secure标志（true/false），如果不设置则根据URL协议自动判断
#   如果使用HTTP，应该设置为 false；如果使用HTTPS，应该设置为 true

# 如果未设置 NEXT_PUBLIC_APP_URL，尝试从环境变量推断
if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  # 可以根据实际情况设置默认值
  # export NEXT_PUBLIC_APP_URL="http://localhost:3000"
  echo "Warning: NEXT_PUBLIC_APP_URL is not set. Cookie secure flag will be determined by NODE_ENV."
fi

# 在后台启动 MCP 服务器（使用 PORT=3001）
echo "Starting MCP server in background on port 3001..."
PORT=3001 node ./mcp/index.js > ./mcp/mcp_server.log 2>&1 &

# 等待一下确保 MCP 服务器启动
sleep 2

# 在前台启动 Web 服务器（使用 PORT=3000，保持容器运行）
echo "Starting Web server on port 3000..."
PORT=3000 exec node ./web/server.js --port 3000 --hostname 127.0.0.1

