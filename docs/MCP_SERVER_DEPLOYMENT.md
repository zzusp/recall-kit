# MCP Server 部署文档

## 目录
- [部署前准备](#部署前准备)
- [部署方式](#部署方式)
  - [Docker 部署](#docker-部署)
  - [PM2 部署](#pm2-部署)
  - [Systemd 部署](#systemd-部署)
  - [云平台部署](#云平台部署)
- [环境配置](#环境配置)
- [监控和维护](#监控和维护)
- [故障排查](#故障排查)

## 部署前准备

### 1. 系统要求

- **Node.js**: >= 20.x
- **内存**: 至少 512MB（推荐 1GB+）
- **磁盘**: 至少 1GB 可用空间
- **网络**: 能够访问 Supabase 服务

### 2. 依赖检查

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 检查系统资源
free -h
df -h
```

### 3. 准备环境变量

创建 `.env` 文件：

```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# 服务器配置
PORT=3001
HOST=0.0.0.0

# CORS 配置
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com

# 可选：日志级别
LOG_LEVEL=info
```

## 部署方式

### Docker 部署

#### 1. 创建 Dockerfile

在 `mcp-server` 目录下创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY src ./src

# 构建项目
RUN npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 从构建阶段复制编译后的文件
COPY --from=builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 更改所有权
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "dist/index.js"]
```

#### 2. 创建 .dockerignore

```
node_modules
dist
.env
*.log
.git
.gitignore
README.md
```

#### 3. 构建镜像

```bash
cd mcp-server
docker build -t recall-kit-mcp-server:latest .
```

#### 4. 运行容器

```bash
docker run -d \
  --name mcp-server \
  --restart unless-stopped \
  -p 3001:3001 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_KEY=your-anon-key \
  -e PORT=3001 \
  -e HOST=0.0.0.0 \
  -e ALLOWED_ORIGINS=https://app.example.com \
  recall-kit-mcp-server:latest
```

#### 5. 使用 Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: recall-kit-mcp-server
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - PORT=3001
      - HOST=0.0.0.0
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

启动：

```bash
docker-compose up -d
```

查看日志：

```bash
docker-compose logs -f mcp-server
```

### PM2 部署

#### 1. 安装 PM2

```bash
npm install -g pm2
```

#### 2. 构建项目

```bash
cd mcp-server
npm install
npm run build
```

#### 3. 创建 PM2 配置文件

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: './dist/index.js',
    instances: 2, // 或 'max' 使用所有 CPU 核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10
  }]
};
```

#### 4. 启动应用

```bash
# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs mcp-server

# 监控
pm2 monit

# 保存配置（开机自启）
pm2 save
pm2 startup
```

#### 5. 常用命令

```bash
# 重启
pm2 restart mcp-server

# 停止
pm2 stop mcp-server

# 删除
pm2 delete mcp-server

# 重新加载（零停机）
pm2 reload mcp-server

# 查看详细信息
pm2 show mcp-server
```

### Systemd 部署

#### 1. 创建服务文件

创建 `/etc/systemd/system/mcp-server.service`:

```ini
[Unit]
Description=Recall Kit MCP Server
Documentation=https://github.com/your-org/recall-kit
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-server

# 环境变量
Environment=NODE_ENV=production
EnvironmentFile=/opt/mcp-server/.env

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/mcp-server

# 资源限制
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

#### 2. 设置权限

```bash
# 创建目录
sudo mkdir -p /opt/mcp-server
sudo chown -R www-data:www-data /opt/mcp-server

# 复制文件
sudo cp -r mcp-server/* /opt/mcp-server/

# 设置环境变量文件权限
sudo chmod 600 /opt/mcp-server/.env
```

#### 3. 启用和启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启用服务（开机自启）
sudo systemctl enable mcp-server

# 启动服务
sudo systemctl start mcp-server

# 查看状态
sudo systemctl status mcp-server

# 查看日志
sudo journalctl -u mcp-server -f
```

### 云平台部署

#### Vercel 部署

创建 `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### Railway 部署

1. 连接 GitHub 仓库
2. 设置环境变量
3. 设置构建命令：`npm install && npm run build`
4. 设置启动命令：`npm start`

#### Heroku 部署

创建 `Procfile`:

```
web: node dist/index.js
```

部署：

```bash
heroku create your-app-name
heroku config:set SUPABASE_URL=...
heroku config:set SUPABASE_KEY=...
git push heroku main
```

#### AWS EC2 部署

1. **创建 EC2 实例**
   - 选择 Ubuntu 22.04 LTS
   - 至少 t2.small 实例类型

2. **安装 Node.js**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **部署应用**

```bash
# 克隆仓库
git clone <repository-url>
cd recall-kit/mcp-server

# 安装依赖
npm install --production

# 构建
npm run build

# 使用 PM2 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

4. **配置 Nginx 反向代理**

创建 `/etc/nginx/sites-available/mcp-server`:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/mcp-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 环境配置

### 生产环境变量

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Server
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# CORS
ALLOWED_ORIGINS=https://app.example.com,https://www.example.com

# 日志
LOG_LEVEL=info
```

### 安全配置

1. **使用 HTTPS**
   - 配置 SSL 证书
   - 使用 Let's Encrypt 免费证书

2. **防火墙设置**

```bash
# 只允许必要端口
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

3. **环境变量保护**
   - 使用密钥管理服务（AWS Secrets Manager, HashiCorp Vault）
   - 不要将 `.env` 文件提交到代码仓库

## 监控和维护

### 健康检查

设置定期健康检查：

```bash
# 使用 cron
*/5 * * * * curl -f http://localhost:3001/health || systemctl restart mcp-server
```

### 日志管理

使用 logrotate 管理日志：

创建 `/etc/logrotate.d/mcp-server`:

```
/opt/mcp-server/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 性能监控

1. **使用 PM2 监控**

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

2. **使用监控工具**
   - New Relic
   - Datadog
   - Prometheus + Grafana

### 备份策略

定期备份：
- 数据库（Supabase 自动备份）
- 配置文件
- 日志文件

## 故障排查

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查日志
   sudo journalctl -u mcp-server -n 50
   
   # 检查端口占用
   sudo lsof -i :3001
   
   # 检查环境变量
   sudo systemctl show mcp-server --property=Environment
   ```

2. **内存不足**
   ```bash
   # 检查内存使用
   free -h
   
   # 检查进程内存
   pm2 monit
   ```

3. **连接 Supabase 失败**
   - 检查网络连接
   - 验证 Supabase 凭证
   - 检查防火墙规则

### 调试模式

启用详细日志：

```bash
# 临时启用
DEBUG=* npm start

# 或修改环境变量
LOG_LEVEL=debug
```

## 更新部署

### 更新步骤

1. **备份当前版本**
   ```bash
   cp -r /opt/mcp-server /opt/mcp-server.backup
   ```

2. **拉取新代码**
   ```bash
   cd /opt/mcp-server
   git pull origin main
   ```

3. **安装依赖并构建**
   ```bash
   npm install
   npm run build
   ```

4. **重启服务**
   ```bash
   # PM2
   pm2 restart mcp-server
   
   # Systemd
   sudo systemctl restart mcp-server
   
   # Docker
   docker-compose restart mcp-server
   ```

5. **验证**
   ```bash
   curl http://localhost:3001/health
   ```

## 更多信息

- [MCP Server 使用文档](./MCP_SERVER_USAGE.md)
- [MCP Client 使用文档](./MCP_CLIENT_USAGE.md)

