# NextAuth.js 迁移批量更新脚本

## 已更新的路由

### ✅ 已完成
- `/api/experiences/route.ts` (POST)
- `/api/admin/experiences/route.ts` (GET, POST)
- `/api/admin/experiences/[id]/route.ts` (PUT, DELETE)
- `/api/admin/my-experiences/[id]/route.ts` (GET, PUT, PATCH)
- `/api/auth/logout/route.ts`
- `/api/admin/user-dashboard/stats/route.ts`
- `/api/admin/user-dashboard/recent-experiences/route.ts`
- `/api/admin/profile-settings/route.ts` (GET, POST)

### ⏳ 待更新
以下路由需要类似的更新（使用相同的模式）：

1. `/api/admin/permissions/route.ts`
2. `/api/admin/permissions/[id]/route.ts`
3. `/api/admin/roles/route.ts`
4. `/api/admin/roles/[id]/route.ts`
5. `/api/admin/settings/route.ts`
6. `/api/admin/my-experiences/[id]/embedding/route.ts`
7. `/api/admin/users/[id]/password/route.ts`
8. `/api/admin/experiences/generate-embeddings/route.ts`
9. `/api/admin/profile-settings/password/route.ts`
10. `/api/api-keys/route.ts`
11. `/api/api-keys/[id]/route.ts`
12. `/api/api-keys/[id]/copy/route.ts`

## 更新模式

### 1. 更新导入
```typescript
// 旧
import { getCurrentUser } from '@/lib/server/services/auth';
// 或
import { requireAuth } from '@/lib/server/middleware/auth';

// 新
import { getServerSession } from '@/lib/server/auth';
// 如果需要权限检查
import { getServerSession, hasRole, isAdminOrSuperuser, hasPermission } from '@/lib/server/auth';
```

### 2. 更新鉴权代码
```typescript
// 旧模式 1
const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
if (!sessionToken) {
  return ApiRouteResponse.unauthorized('未授权访问');
}
const currentUser = await getCurrentUser(sessionToken);
if (!currentUser) {
  return ApiRouteResponse.unauthorized('用户未登录');
}

// 旧模式 2
const auth = await requireAuth(request);
if ('error' in auth) {
  return ApiRouteResponse.unauthorized(auth.error);
}
const currentUser = auth.user;

// 新模式
const session = await getServerSession();
if (!session) {
  return ApiRouteResponse.unauthorized('未授权访问');
}
const currentUser = session.user as any;
```

### 3. 权限检查
```typescript
// 旧
if (!hasRole(user, 'admin') && !user.is_superuser) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
}

// 新
if (!isAdminOrSuperuser(session)) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
}
```

## 注意事项

1. **用户 ID 访问**: 使用 `currentUser.id` 保持不变
2. **权限检查**: 使用新的辅助函数 `hasPermission`, `hasRole`, `isAdminOrSuperuser`
3. **类型转换**: `session.user as any` 用于访问自定义字段（roles, permissions 等）

