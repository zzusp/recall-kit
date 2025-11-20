# 用户个人设置功能数据库迁移

## 需要添加的字段

为了支持个人设置功能，需要在 `users` 表中添加以下字段：

```sql
-- 添加用户个人设置相关字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'zh-CN',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS avatar VARCHAR(500),
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 创建用户活动日志表（可选，用于记录密码修改等操作）
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_activity_user_id (user_id),
    INDEX idx_user_activity_created_at (created_at)
);
```

## 字段说明

- `full_name`: 用户真实姓名
- `bio`: 个人简介
- `timezone`: 用户时区设置
- `language`: 语言偏好设置
- `email_notifications`: 是否接收邮件通知
- `push_notifications`: 是否接收推送通知
- `avatar`: 头像URL
- `last_password_change`: 最后修改密码时间
- `is_active`: 账户是否激活状态
- `user_activity_logs`: 用户活动日志表，记录重要操作

## 执行迁移

在 PostgreSQL 数据库中执行上述 SQL 语句即可完成迁移。