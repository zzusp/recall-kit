import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get permission with roles
    const result = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.code,
        p.type,
        p.parent_id,
        p.page_path,
        p.description,
        p.sort_order,
        p.is_active,
        p.created_at,
        p.updated_at,
        (
          SELECT COALESCE(
            json_agg(
              jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
            ),
            '[]'::json
          )
          FROM role_permissions rp
          JOIN roles r ON rp.role_id = r.id
          WHERE rp.permission_id = p.id
        ) as roles,
        (
          SELECT COALESCE(
            json_agg(r.id),
            '[]'::json
          )
          FROM role_permissions rp
          JOIN roles r ON rp.role_id = r.id
          WHERE rp.permission_id = p.id
        ) as role_ids
      FROM permissions p
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Add roles_count to the permission
    const permission = {
      ...result.rows[0],
      roles_count: Array.isArray(result.rows[0]?.role_ids) ? result.rows[0].role_ids.length : 0
    };

    return NextResponse.json(permission);
  } catch (error) {
    console.error('Error fetching permission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, code, type, parent_id, page_path, description, sort_order, is_active } = body;

    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // Check if user has permission to update permissions
    if (!currentUser.is_superuser && !hasPermission(session, 'permissions.edit')) {
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

    const existingPermission = existingPermissionResult.rows[0];

    // Validate type constraints
    if (type) {
      if (type === 'function' && !code) {
        return NextResponse.json(
          { error: 'Code is required for function type permissions' },
          { status: 400 }
        );
      }
      if (type === 'page' && !page_path) {
        return NextResponse.json(
          { error: 'Page_path is required for page type permissions' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate code (if code is provided and type is function)
    if (code && (type === 'function' || existingPermission.type === 'function')) {
      const duplicateResult = await db.query(
        'SELECT id FROM permissions WHERE code = $1 AND id != $2',
        [code, id]
      );

      if (duplicateResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Permission with this code already exists' },
          { status: 409 }
        );
      }
    }

    // Validate parent_id if provided
    if (parent_id !== undefined) {
      if (parent_id === id) {
        return NextResponse.json(
          { error: 'Permission cannot be its own parent' },
          { status: 400 }
        );
      }

      // Check parent type constraints
      const finalType = type || existingPermission.type;
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
        if (finalType === 'function' && parentType !== 'page') {
          return NextResponse.json(
            { error: 'Function permissions must have a page as parent' },
            { status: 400 }
          );
        }
        if (finalType === 'page' && parentType !== 'module') {
          return NextResponse.json(
            { error: 'Page permissions must have a module as parent' },
            { status: 400 }
          );
        }
        if (finalType === 'module' && parentType && parentType !== 'module') {
          return NextResponse.json(
            { error: 'Module permissions can only have another module or NULL as parent' },
            { status: 400 }
          );
        }
      }
    }

    // Update permission
    const permissionResult = await db.query(
      `UPDATE permissions 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           type = COALESCE($3, type),
           parent_id = COALESCE($4, parent_id),
           page_path = COALESCE($5, page_path),
           description = COALESCE($6, description),
           sort_order = COALESCE($7, sort_order),
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, code, type, parent_id, page_path, description, sort_order, is_active, id]
    );

    const permission = permissionResult.rows[0];

    // Fetch updated permission with roles
    const updatedPermissionResult = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.code,
        p.type,
        p.parent_id,
        p.page_path,
        p.description,
        p.sort_order,
        p.is_active,
        p.created_at,
        p.updated_at,
        (
          SELECT COALESCE(
            json_agg(
              jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
            ),
            '[]'::json
          )
          FROM role_permissions rp
          JOIN roles r ON rp.role_id = r.id
          WHERE rp.permission_id = p.id
        ) as roles,
        (
          SELECT COALESCE(
            json_agg(r.id),
            '[]'::json
          )
          FROM role_permissions rp
          JOIN roles r ON rp.role_id = r.id
          WHERE rp.permission_id = p.id
        ) as role_ids
      FROM permissions p
      WHERE p.id = $1
    `, [id]);

    // Add roles_count to the updated permission
    const updatedPermission = {
      ...updatedPermissionResult.rows[0],
      roles_count: Array.isArray(updatedPermissionResult.rows[0]?.role_ids) ? updatedPermissionResult.rows[0].role_ids.length : 0
    };

    return NextResponse.json(updatedPermission);
  } catch (error) {
    console.error('Error updating permission:', error);
    return NextResponse.json(
      { error: 'Failed to update permission' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // Check if user has permission to delete permissions
    if (!currentUser.is_superuser && !hasPermission(session, 'permissions.delete')) {
      return NextResponse.json(
        { error: '您没有权限执行此操作' },
        { status: 403 }
      );
    }

    // Check if permission exists
    const existingPermissionResult = await db.query(
      'SELECT id FROM permissions WHERE id = $1',
      [id]
    );

    if (existingPermissionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    // Check if permission has children
    const childrenResult = await db.query(
      'SELECT COUNT(*) as count FROM permissions WHERE parent_id = $1',
      [id]
    );

    if (parseInt(childrenResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete permission that has children' },
        { status: 409 }
      );
    }

    // Check if permission is assigned to any roles
    const rolePermissionsResult = await db.query(
      'SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = $1',
      [id]
    );

    if (parseInt(rolePermissionsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete permission that is assigned to roles' },
        { status: 409 }
      );
    }

    // Delete permission
    const result = await db.query(
      'DELETE FROM permissions WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete permission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json(
      { error: 'Failed to delete permission' },
      { status: 500 }
    );
  }
}