# MCP Server API Contract

**Version**: 1.0.0  
**Protocol**: Model Context Protocol (MCP)  
**Base URL**: `mcp://recall-kit-server` (或HTTP端点，根据MCP实现)

## Overview

MCP Server提供两个核心功能：
1. **查询经验记录** (query_experiences)
2. **提交经验记录** (submit_experience)

## Authentication

MCP Server支持匿名访问，无需认证。

## Endpoints

### 1. Query Experiences (查询经验记录)

**Method**: MCP Tool Call  
**Tool Name**: `query_experiences`

**Description**: 根据关键词或语义匹配查询经验记录，返回按综合排序规则排列的结果。

**Request**:

```typescript
interface QueryExperiencesRequest {
  keywords: string;           // 查询关键词
  limit?: number;             // 返回数量限制，默认10，最大50
  offset?: number;            // 分页偏移量，默认0
}
```

**Response**:

```typescript
interface QueryExperiencesResponse {
  success: boolean;
  data?: {
    experiences: ExperienceRecord[];
    total: number;            // 总匹配数
    limit: number;
    offset: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface ExperienceRecord {
  id: string;                 // UUID
  title: string;
  problem_description: string;
  root_cause?: string;        // 根本原因（可选）
  solution: string;
  context?: string;           // 上下文信息（包含代码片段，已脱敏）
  keywords: string[];         // 关键字数组（如：["nodejs", "react", "typescript"]）
  query_count: number;        // 查询次数
  created_at: string;         // ISO 8601格式
  relevance_score: number;    // 相关性得分
}
```

**Error Codes**:
- `INVALID_KEYWORDS`: 关键词为空或格式错误
- `INVALID_LIMIT`: limit超出范围（1-50）
- `DATABASE_ERROR`: 数据库查询错误
- `TIMEOUT`: 查询超时

**Example Request**:
```json
{
  "keywords": "React useState hook not updating",
  "limit": 10,
  "offset": 0
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "experiences": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "React useState not updating state",
        "problem_description": "State variable not updating after setState call",
        "root_cause": "React 18's strict mode causes double rendering, and direct state updates may be batched incorrectly",
        "solution": "Use functional update form: setState(prev => prev + 1)",
        "context": "React 18+ with strict mode\n\nCode example:\nconst [count, setCount] = useState(0);\nsetCount(count + 1); // Wrong\nsetCount(prev => prev + 1); // Correct",
        "keywords": ["react", "hooks", "state"],
        "query_count": 45,
        "created_at": "2025-01-20T10:30:00Z",
        "relevance_score": 0.95
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

**Sorting Algorithm**:
结果按以下公式排序：
```
final_score = (relevance_score * 0.6) + (normalized_query_count * 0.3) + (normalized_recency * 0.1)
```
- relevance_score: 相关性得分（0-1）
- normalized_query_count: 查询次数归一化（0-1）
- normalized_recency: 时间新鲜度归一化（0-1）

**Implementation Notes**:
- 查询接口返回结果后，应用代码需要批量更新返回的经验记录的 `query_count` 字段（+1）
- 同时更新 `updated_at` 字段为当前时间
- 更新操作应在返回响应后异步执行，避免影响响应时间

### 2. Submit Experience (提交经验记录)

**Method**: MCP Tool Call  
**Tool Name**: `submit_experience`

**Description**: 提交新的经验记录到平台，自动发布并立即可被查询。

**Request**:

```typescript
interface SubmitExperienceRequest {
  title: string;              // 1-500字符
  problem_description: string; // 必填
  root_cause?: string;        // 可选，根本原因
  solution: string;           // 必填
  context?: string;           // 可选，上下文信息（如果包含代码片段，必须已脱敏）
  keywords?: string[];        // 可选，关键字数组（AI自动生成，用户可编辑）
}
```

**Response**:

```typescript
interface SubmitExperienceResponse {
  success: boolean;
  data?: {
    id: string;               // 新创建的经验记录ID
    status: 'published';      // 状态
    message: string;
  };
  error?: {
    code: string;
    message: string;
    validation_errors?: ValidationError[];
  };
}

interface ValidationError {
  field: string;
  message: string;
}
```

**Error Codes**:
- `VALIDATION_ERROR`: 数据验证失败
- `CONTEXT_NOT_SANITIZED`: 上下文信息中包含未脱敏的代码片段
- `INVALID_TITLE`: 标题长度不符合要求
- `MISSING_REQUIRED_FIELDS`: 缺少必填字段
- `DATABASE_ERROR`: 数据库保存错误

**Validation Rules**:
1. title: 1-500字符，必填
2. problem_description: 非空，必填
3. root_cause: 可选，如果提供则不能为空字符串
4. solution: 非空，必填
5. context: 可选，如果包含代码片段，必须已脱敏
6. keywords: 数组，每个关键字1-100字符，会自动转换为小写并去除首尾空格

**Example Request**:
```json
{
  "title": "React useState not updating state",
  "problem_description": "State variable not updating after setState call in React 18",
  "root_cause": "React 18's strict mode causes double rendering, and direct state updates may be batched incorrectly",
  "solution": "Use functional update form: setState(prev => prev + 1) instead of setState(count + 1)",
  "context": "React 18+ with strict mode enabled\n\nCode example:\nconst [count, setCount] = useState(0);\nsetCount(count + 1); // Wrong\nsetCount(prev => prev + 1); // Correct",
  "keywords": ["react", "hooks", "state"]
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "published",
    "message": "Experience record created and published successfully"
  }
}
```

**Example Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "validation_errors": [
      {
        "field": "context",
        "message": "Context contains unsanitized code snippet"
      }
    ]
  }
}
```

## Rate Limiting

无配额限制，但建议：
- 查询请求：建议不超过10次/秒
- 提交请求：建议不超过5次/秒

## Response Time

- 查询请求：90%在2秒内返回
- 提交请求：95%在1秒内完成

## Error Handling

所有错误响应遵循统一格式：
```typescript
{
  success: false,
  error: {
    code: string;      // 错误代码
    message: string;   // 错误消息
    details?: any;     // 可选的错误详情
  }
}
```

