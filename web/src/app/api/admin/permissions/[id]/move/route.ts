import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// 检查是否存在循环引用（检查 newParentId 是否是当前节点的子节点）
async function checkCircularReference(permissionId: string, newParentId: string): Promise<boolean> {
  if (!newParentId) {
    return false; // NULL parent is fine
  }

  // 递归检查 newParentId 的所有祖先是否包含 permissionId
  const visited = new Set<string>();
  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === permissionId) {
      return true; // 发现循环引用
    }

    if (visited.has(currentId)) {
      break; // 防止无限循环
    }
    visited.add(currentId);

    const result = await db.query(
      'SELECT parent_id FROM permissions WHERE id = $1',
      [currentId]
    );

    if (result.rows.length === 0) {
      break;
    }

    currentId = result.rows[0].parent_id;
  }

  return false;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { parent_id, sort_order } = body;

    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // Check if user has permission to move permissions
    if (!currentUser.is_superuser && !hasPermission(session, 'permissions.move')) {
      return NextResponse.json(
        { error: '您没有权限执行此操作' },
        { status: 403 }
      );
    }

    // Check if permission exists
    const existingPermissionResult = await db.query(
      'SELECT id, type FROM permissions WHERE id = $1',
      [id]
    );

    if (existingPermissionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    const permission = existingPermissionResult.rows[0];

    // Validate parent_id if provided
    if (parent_id !== undefined) {
      // Check for circular reference
      const hasCircularRef = await checkCircularReference(id, parent_id);
      if (hasCircularRef) {
        return NextResponse.json(
          { error: 'Cannot move permission to its own descendant' },
          { status: 400 }
        );
      }

      if (parent_id) {
        const parentResult = await db.query(
          'SELECT type FROM permissions WHERE id = $1',
          [parent_id]
        );

        if (parentResult.rows.length === 0) {
          return NextResponse.json(
            { error: 'Parent permission not found' },
            { status: 404 }
          );
        }

        const parentType = parentResult.rows[0].type;

        // Validate type constraints
        if (permission.type === 'function' && parentType !== 'page') {
          return NextResponse.json(
            { error: 'Function permissions must have a page as parent' },
            { status: 400 }
          );
        }
        if (permission.type === 'page' && parentType !== 'module') {
          return NextResponse.json(
            { error: 'Page permissions must have a module as parent' },
            { status: 400 }
          );
        }
        if (permission.type === 'module' && parentType && parentType !== 'module') {
          return NextResponse.json(
            { error: 'Module permissions can only have another module or NULL as parent' },
            { status: 400 }
          );
        }
      } else {
        // parent_id is NULL
        if (permission.type !== 'module') {
          return NextResponse.json(
            { error: 'Only module permissions can have NULL parent_id' },
            { status: 400 }
          );
        }
      }
    }

    // Update permission
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (parent_id !== undefined) {
      updateFields.push(`parent_id = $${paramIndex}`);
      updateValues.push(parent_id);
      paramIndex++;
    }

    if (sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramIndex}`);
      updateValues.push(sort_order);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE permissions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, updateValues);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error moving permission:', error);
    return NextResponse.json(
      { error: 'Failed to move permission' },
      { status: 500 }
    );
  }
}

