# Web API Contract

**Version**: 1.0.0  
**Base URL**: `/api/v1`  
**Protocol**: RESTful HTTP/JSON

## Overview

Web API提供以下功能：
1. 经验记录查询和浏览（匿名访问）
2. 管理员认证和管理功能（需要认证）

## Authentication

- **匿名访问**: 查询和浏览功能无需认证
- **管理员访问**: 使用Supabase Auth JWT Token
  - Header: `Authorization: Bearer <token>`

## Public Endpoints (无需认证)

### 1. GET /experiences

查询经验记录列表。

**Query Parameters**:
- `q` (string, optional): 搜索关键词
- `keywords` (string[], optional): 关键字筛选，多个关键字用逗号分隔（精确匹配）
- `limit` (number, optional): 返回数量，默认10，最大50
- `offset` (number, optional): 分页偏移量，默认0
- `sort` (string, optional): 排序方式，可选值：'relevance'（默认）、'newest'、'popular'

**Response**:
```typescript
{
  success: boolean;
  data?: {
    experiences: ExperienceRecord[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: ErrorResponse;
}
```

**Example**:
```
GET /api/v1/experiences?q=react&limit=10&offset=0&sort=relevance
```

**Implementation Notes**:
- 查询接口返回结果后，应用代码需要批量更新返回的经验记录的 `query_count` 字段（+1）
- 同时更新 `updated_at` 字段为当前时间
- 更新操作应在返回响应后异步执行，避免影响响应时间

### 2. GET /experiences/:id

获取单个经验记录的详细信息。

**Path Parameters**:
- `id` (UUID): 经验记录ID

**Response**:
```typescript
{
  success: boolean;
  data?: ExperienceRecord;
  error?: ErrorResponse;
}
```

**Error Codes**:
- `NOT_FOUND`: 记录不存在或已删除

### 3. GET /keywords

获取热门关键字列表（基于使用频率）。

**Query Parameters**:
- `limit` (number, optional): 返回数量，默认100
- `q` (string, optional): 关键字搜索（精确匹配或LIKE查询）

**Response**:
```typescript
{
  success: boolean;
  data?: {
    keywords: Keyword[];
    total: number;
  };
  error?: ErrorResponse;
}

interface Keyword {
  keyword: string;           // 关键字内容
  count: number;             // 使用该关键字的经验记录数量
}
```

**Note**: 关键字不需要预先定义，此接口返回实际使用中的关键字及其使用频率。

### 4. GET /stats

获取平台统计信息。

**Response**:
```typescript
{
  success: boolean;
  data?: {
    total_experiences: number;
    total_keywords: number;  // 唯一关键字总数
    total_queries: number;
  };
}
```

## Admin Endpoints (需要认证)

### 5. POST /auth/login

管理后台登录。

**Request Body**:
```typescript
{
  email: string;
  password: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    token: string;
    user: {
      id: string;
      email: string;
      role: 'admin';
    };
  };
  error?: ErrorResponse;
}
```

### 6. GET /admin/experiences

获取所有经验记录（包括已删除的）。

**Query Parameters**: 同 `/experiences`

**Response**: 同 `/experiences`，但包含status='deleted'的记录

### 7. PUT /admin/experiences/:id

编辑经验记录。

**Request Body**:
```typescript
{
  title?: string;
  problem_description?: string;
  root_cause?: string;
  solution?: string;
  context?: string;
  keywords?: string[];
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    id: string;
    message: string;
  };
  error?: ErrorResponse;
}
```

### 8. DELETE /admin/experiences/:id

删除经验记录（软删除）。

**Response**:
```typescript
{
  success: boolean;
  data?: {
    id: string;
    message: string;
  };
  error?: ErrorResponse;
}
```

### 9. POST /admin/experiences/:id/restore

恢复已删除的经验记录。

**Response**:
```typescript
{
  success: boolean;
  data?: {
    id: string;
    message: string;
  };
  error?: ErrorResponse;
}
```

### 10. POST /admin/experiences/batch-delete

批量删除经验记录。

**Request Body**:
```typescript
{
  ids: string[];  // 经验记录ID数组
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    deleted_count: number;
    message: string;
  };
  error?: ErrorResponse;
}
```

### 11. POST /admin/experiences/batch-restore

批量恢复经验记录。

**Request Body**:
```typescript
{
  ids: string[];  // 经验记录ID数组
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    restored_count: number;
    message: string;
  };
  error?: ErrorResponse;
}
```

### 12. POST /admin/users

创建新管理员账户。

**Request Body**:
```typescript
{
  email: string;
  password: string;
  username: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    id: string;
    email: string;
    message: string;
  };
  error?: ErrorResponse;
}
```

### 13. GET /admin/stats

获取管理员统计信息。

**Response**:
```typescript
{
  success: boolean;
  data?: {
    total_experiences: number;
    published_experiences: number;
    deleted_experiences: number;
    total_queries: number;
    total_submissions: number;
    recent_activities: AdminAction[];
  };
}
```

## Error Response Format

所有错误响应遵循统一格式：

```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

**Common Error Codes**:
- `UNAUTHORIZED`: 未认证或token无效
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 数据验证失败
- `INTERNAL_ERROR`: 服务器内部错误

## Rate Limiting

无配额限制，但建议：
- 查询请求：建议不超过20次/秒
- 管理操作：建议不超过10次/秒

## CORS

允许所有来源访问公共端点，管理员端点需要认证。

