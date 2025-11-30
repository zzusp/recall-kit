# 生产环境部署配置说明

## 问题：线上环境登录后获取session返回null

### 问题原因

在生产环境中，如果使用HTTP协议（而非HTTPS），但cookie的`secure`标志被设置为`true`，浏览器将不会发送cookie，导致session无法获取。

### 解决方案

#### 1. 设置环境变量

在Docker容器启动时，需要设置以下环境变量：

**对于HTTP协议（如 `http://www.codeva-cn.com:3100`）：**

```bash
# 必须设置：NextAuth.js 密钥（至少32个字符）
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars

# 必须设置：应用完整URL
NEXT_PUBLIC_APP_URL=http://www.codeva-cn.com:3100

# 可选：强制设置cookie secure标志为false（因为使用HTTP）
COOKIE_SECURE=false
```

**对于HTTPS协议：**

```bash
# 必须设置：NextAuth.js 密钥（至少32个字符）
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars

# 必须设置：应用完整URL
NEXT_PUBLIC_APP_URL=https://www.codeva-cn.com

# 可选：强制设置cookie secure标志为true（因为使用HTTPS）
COOKIE_SECURE=true
```

#### 2. Docker运行命令示例

```bash
docker run -d \
  -p 3100:3000 \
  -p 3001:3001 \
  -e NEXTAUTH_SECRET=your-secret-key-here-min-32-chars \
  -e NEXT_PUBLIC_APP_URL=http://www.codeva-cn.com:3100 \
  -e COOKIE_SECURE=false \
  -e DATABASE_URL=postgresql://user:password@host:5432/dbname \
  recall-kit:1.0.0
```

#### 3. Docker Compose示例

```yaml
version: '3.8'
services:
  recall-kit:
    image: recall-kit:1.0.0
    ports:
      - "3100:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - NEXTAUTH_SECRET=your-secret-key-here-min-32-chars
      - NEXT_PUBLIC_APP_URL=http://www.codeva-cn.com:3100
      - COOKIE_SECURE=false
      - DATABASE_URL=postgresql://user:password@host:5432/dbname
    restart: unless-stopped
```

### 环境变量说明

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `NEXTAUTH_SECRET` | 是 | NextAuth.js密钥，至少32个字符 | `your-secret-key-here-min-32-chars` |
| `NEXT_PUBLIC_APP_URL` | 是 | 应用的完整URL，用于判断协议 | `http://www.codeva-cn.com:3100` 或 `https://www.codeva-cn.com` |
| `COOKIE_SECURE` | 否 | 强制设置cookie secure标志。如果不设置，会根据`NEXT_PUBLIC_APP_URL`的协议自动判断 | `true` 或 `false` |
| `DATABASE_URL` | 是 | 数据库连接字符串 | `postgresql://user:password@host:5432/dbname` |

### Cookie Secure标志逻辑

代码会根据以下优先级决定cookie的`secure`标志：

1. 如果设置了`COOKIE_SECURE`环境变量，直接使用该值
2. 如果设置了`NEXT_PUBLIC_APP_URL`，根据URL协议判断：
   - `https://` → `secure: true`
   - `http://` → `secure: false`
3. 默认：根据`NODE_ENV`判断（生产环境为`true`，开发环境为`false`）

### 验证配置

部署后，可以通过以下方式验证：

1. **检查cookie是否设置**：
   - 打开浏览器开发者工具
   - 查看Application/Storage → Cookies
   - 确认`next-auth.session-token` cookie存在

2. **检查session端点**：
   ```bash
   curl -v http://www.codeva-cn.com:3100/api/auth/session \
     -H "Cookie: next-auth.session-token=your-token"
   ```

3. **检查环境变量**：
   ```bash
   docker exec <container-id> env | grep -E "NEXTAUTH_SECRET|NEXT_PUBLIC_APP_URL|COOKIE_SECURE"
   ```

### 常见问题

#### Q: 为什么本地开发环境正常，但线上环境返回null？

A: 本地开发环境通常使用HTTP，且`NODE_ENV=development`，所以`secure: false`。但生产环境如果`NODE_ENV=production`且未设置`NEXT_PUBLIC_APP_URL`，会默认使用`secure: true`，导致HTTP环境下cookie无法发送。

#### Q: 如何生成NEXTAUTH_SECRET？

A: 可以使用以下命令生成：

```bash
# 使用openssl
openssl rand -base64 32

# 或使用node
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Q: 使用反向代理（如Nginx）时需要注意什么？

A: 如果使用反向代理，需要确保：
1. 正确设置`X-Forwarded-Proto`头（HTTP或HTTPS）
2. 正确设置`X-Forwarded-Host`头
3. 根据实际协议设置`COOKIE_SECURE`或`NEXT_PUBLIC_APP_URL`

### 安全建议

1. **使用HTTPS**：强烈建议在生产环境使用HTTPS，这样可以：
   - 启用cookie的`secure`标志，提高安全性
   - 保护数据传输安全
   - 符合现代Web安全标准

2. **保护NEXTAUTH_SECRET**：
   - 使用强随机密钥（至少32个字符）
   - 不要将密钥提交到代码仓库
   - 使用密钥管理服务（如AWS Secrets Manager、HashiCorp Vault）

3. **定期轮换密钥**：
   - 定期更换`NEXTAUTH_SECRET`
   - 轮换时，用户需要重新登录

