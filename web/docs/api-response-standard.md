<![CDATA
# API响应格式标准

## 概述

为确保前后端数据格式一致性，所有API路由必须遵循统一的响应格式标准。

## 标准响应格式

### 成功响应

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;           // 实际数据
  message?: string;   // 可选的成功消息
  timestamp?: string; // 响应时间戳
}
```

### 错误响应

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;     // 错误代码
    message: string;  // 错误消息
    details?: any;    // 可选的错误详情
  };
  timestamp?: string; // 响应时间戳
}
```

### 分页数据响应

```typescript
interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## 使用示例

### 基本用法

```typescript
import { ApiRouteResponse } from '@/lib/utils/apiResponse';

// 成功响应
return ApiRouteResponse.success(data, '操作成功');

// 分页响应
return ApiRouteResponse.paginated(items, page, limit, total);

// 错误响应
return ApiRouteResponse.notFound('资源不存在');
return ApiRouteResponse.badRequest('参数错误', details);
```

### 完整API路由示例

```typescript
import { NextRequest } from 'next/server';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    
    return ApiRouteResponse.success(data, '获取成功');
  } catch (error) {
    console.error('API Error:', error);
    return ApiRouteResponse.internalError('操作失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
```

## 错误代码规范

| 代码 | HTTP状态码 | 说明 |
|------|-----------|------|
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| BAD_REQUEST | 400 | 请求参数错误 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| CONFLICT | 409 | 数据冲突 |
| DATABASE_ERROR | 500 | 数据库操作失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 迁移指南

### 旧格式（不推荐）

```typescript
// 直接返回数据
return NextResponse.json(data);

// 错误响应
return NextResponse.json(
  { error: 'Failed to fetch data' },
  { status: 500 }
);
```

### 新格式（推荐）

```typescript
// 使用统一工具
return ApiRouteResponse.success(data);
return ApiRouteResponse.internalError('Failed to fetch data');
```

## 前端适配

### API调用示例

```typescript
const response = await fetch('/api/example');
const result = await response.json();

if (result.success) {
  // 处理成功响应
  const data = result.data;
  console.log(result.message); // 可选的成功消息
} else {
  // 处理错误响应
  console.error(result.error.message);
  console.error(result.error.code);
}
```

### 统一错误处理

```typescript
class ApiClient {
  async request(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error.message);
    }
  }
}
```

## 工具函数说明

### ApiRouteResponse 类

提供静态方法用于创建标准响应：

- `success(data, message?, status?)` - 成功响应
- `paginated(items, page, limit, total, message?)` - 分页响应
- `error(code, message, details?, status?)` - 通用错误响应
- `unauthorized(message?)` - 401错误
- `forbidden(message?)` - 403错误
- `badRequest(message?, details?)` - 400错误
- `notFound(message?)` - 404错误
- `internalError(message?, details?)` - 500错误

### 预定义错误

```typescript
import { ErrorResponses } from '@/lib/utils/apiResponse';

return ErrorResponses.unauthorized('未授权访问');
return ErrorResponses.badRequest('参数错误', validationErrors);
```

## 注意事项

1. **一致性**: 所有API路由必须使用统一的响应格式
2. **错误处理**: 使用预定义的错误响应类型
3. **开发环境**: 在开发环境包含错误详情便于调试
4. **时间戳**: 所有响应自动包含时间戳
5. **分页**: 列表类API使用标准分页格式
6. **向后兼容**: 逐步迁移现有API，确保前端适配

## 实施计划

- [x] 创建响应工具函数
- [x] 更新核心API路由
- [ ] 更新所有API路由
- [ ] 更新前端适配层
- [ ] 添加API响应测试
- [ ] 更新API文档