# Data Model: 经验分享平台

**Feature**: 001-experience-sharing-platform  
**Date**: 2025-11-13  
**Database**: Supabase (PostgreSQL 15+)

## Overview

数据库设计基于Supabase PostgreSQL，使用Row Level Security (RLS)策略确保数据安全。所有表使用snake_case命名，时间戳使用created_at、updated_at、deleted_at格式。

## Entity Relationship Diagram

```
users (Supabase Auth)
  └── profiles (扩展用户信息)
       └── experience_records (经验记录)
            └── experience_keywords (经验关键字关联表)
```

## Tables

### 1. profiles (用户扩展信息表)

扩展Supabase Auth的users表，存储用户角色和管理信息。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) | 用户ID，关联Supabase Auth |
| username | VARCHAR(100) | UNIQUE, NOT NULL | 用户名 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 邮箱 |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'user' | 角色：'user' 或 'admin' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新时间 |
| last_login_at | TIMESTAMPTZ | NULL | 最后登录时间 |

**Indexes**:
- `idx_profiles_email` ON `email`
- `idx_profiles_role` ON `role`

**RLS Policies**:
- 所有用户可读取自己的profile
- 管理员可读取所有profiles
- 只有管理员可更新role字段

### 2. experience_records (经验记录表)

存储用户提交的经验记录，核心数据表。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录ID |
| user_id | UUID | REFERENCES profiles(id) | 提交者ID（可为NULL，支持匿名提交） |
| title | VARCHAR(500) | NOT NULL | 经验标题 |
| problem_description | TEXT | NOT NULL | 问题描述 |
| root_cause | TEXT | NULL | 根本原因 |
| solution | TEXT | NOT NULL | 解决方案 |
| context | TEXT | NULL | 上下文信息（包含代码片段，需脱敏） |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'published' | 状态：'published' 或 'deleted' |
| query_count | INTEGER | NOT NULL, DEFAULT 0 | 查询次数 |
| relevance_score | FLOAT | DEFAULT 0.0 | 相关性得分（用于排序） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新时间 |
| deleted_at | TIMESTAMPTZ | NULL | 删除时间（软删除） |

**Indexes**:
- `idx_experience_records_status` ON `status` WHERE `status = 'published'`
- `idx_experience_records_created_at` ON `created_at DESC`
- `idx_experience_records_query_count` ON `query_count DESC`
- `idx_experience_records_relevance_score` ON `relevance_score DESC`
- `idx_experience_records_user_id` ON `user_id`
- `GIN idx_experience_records_search` ON `to_tsvector('english', title || ' ' || problem_description || ' ' || COALESCE(root_cause, '') || ' ' || solution || ' ' || COALESCE(context, ''))` (全文搜索)

**RLS Policies**:
- 所有用户可读取status='published'的记录
- 只有管理员可读取status='deleted'的记录
- 匿名用户可创建记录（user_id为NULL）
- 只有管理员可更新和删除记录

### 3. experience_keywords (经验关键字表)

存储经验记录的关键字，用于搜索和匹配。关键字不需要预先定义，由AI自动生成或用户手动添加。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 关键字ID |
| experience_id | UUID | REFERENCES experience_records(id) ON DELETE CASCADE | 经验记录ID |
| keyword | VARCHAR(100) | NOT NULL | 关键字内容（如：nodejs, react, typescript） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 创建时间 |

**Indexes**:
- `UNIQUE idx_experience_keywords_unique` ON `(experience_id, keyword)` - 确保同一经验记录不重复关键字
- `idx_experience_keywords_experience_id` ON `experience_id` - 查询某条经验的所有关键字
- `idx_experience_keywords_keyword` ON `keyword` - 查询包含某个关键字的所有经验（用于搜索）

**RLS Policies**:
- 所有用户可读取关键字关联关系
- 系统自动创建关联（通过API）

### 4. query_logs (查询日志表)

记录MCP查询请求，用于统计和优化。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 日志ID |
| query_keywords | TEXT | NOT NULL | 查询关键词 |
| result_count | INTEGER | NOT NULL, DEFAULT 0 | 返回结果数量 |
| response_time_ms | INTEGER | NULL | 响应时间（毫秒） |
| experience_ids | UUID[] | NULL | 返回的经验记录ID列表 |
| query_source | VARCHAR(50) | NOT NULL, DEFAULT 'mcp' | 查询来源：'mcp' 或 'web' |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 创建时间 |

**Indexes**:
- `idx_query_logs_created_at` ON `created_at DESC`
- `idx_query_logs_query_source` ON `query_source`

**RLS Policies**:
- 只有管理员可读取查询日志
- 系统自动创建日志（通过API）


## Database Functions

**Note**: 本版本不在数据库层面使用函数，所有业务逻辑（包括查询次数更新）由应用代码负责。

## Database Triggers

**Note**: 本版本不在数据库层面使用触发器自动更新updated_at字段，改为在应用代码中手动更新，简化数据库设计。

## RLS Policies Summary

### experience_records

- **SELECT**: 所有用户可读取status='published'的记录
- **INSERT**: 匿名用户和管理员可创建记录
- **UPDATE**: 只有管理员可更新记录
- **DELETE**: 只有管理员可删除记录（软删除）

### profiles

- **SELECT**: 所有用户可读取自己的profile，管理员可读取所有
- **UPDATE**: 用户可更新自己的profile（除role字段），管理员可更新所有

### experience_keywords

- **SELECT**: 所有用户可读取关键字关联关系
- **INSERT/UPDATE/DELETE**: 系统自动管理（通过API）

### query_logs, admin_actions

- **SELECT**: 只有管理员可读取
- **INSERT**: 系统自动创建（通过API）

## Data Validation Rules

1. **experience_records**:
   - title长度：1-500字符
   - problem_description和solution不能为空
   - root_cause为可选字段，可以为NULL
   - context字段如果包含代码片段，必须已脱敏
   - status只能是'published'或'deleted'

2. **experience_keywords**:
   - keyword长度：1-100字符
   - keyword会自动转换为小写并去除首尾空格（基础处理）
   - 同一经验记录的关键字不重复（通过唯一索引保证）
   - 允许不同经验记录使用不一致的关键字（如：node、nodejs、node.js 可以同时存在）

3. **profiles**:
   - role只能是'user'或'admin'
   - email必须符合邮箱格式

## Migration Strategy

1. **001_initial_schema.sql**: 创建所有表和基础索引
2. **002_rls_policies.sql**: 创建RLS策略
3. **003_indexes.sql**: 创建性能优化索引
4. **004_seed_data.sql**: 初始化数据（创建第一个管理员账户）

**Note**: 
- `updated_at` 字段的更新由应用代码负责，不在数据库层面使用触发器
- `query_count` 字段的更新由应用代码负责，在查询接口返回结果后批量更新

**Note**: 本版本不包含版本管理功能，已移除experience_versions表及相关函数和触发器。

## 关键字处理策略

**Note**: 第一个版本采用简单的关键字存储策略，不做规范化处理。

1. **存储**：
   - 关键字直接存储，不做规范化处理
   - 转换为小写并去除首尾空格（基础处理）
   - 允许不一致的关键字存在（如：node、nodejs、node.js 可以同时存在）

2. **查询**：
   - 使用精确匹配或LIKE查询
   - 不做模糊匹配或相似度搜索

3. **AI生成关键字**：
   - AI根据上下文重点，生成关键字后直接存储，不做统一处理

