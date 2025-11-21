import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/internal/authService';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await db.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 CASE WHEN r.id IS NOT NULL THEN 
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 END
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles,
             COALESCE(
               json_agg(r.id) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as role_ids
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      WHERE p.id = $1
      GROUP BY p.id
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
    const { name, resource, action, description } = body;

    // Verify user and permissions - 从Authorization头或cookie中获取token
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.cookies.get('session_token')?.value;
    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superusers can update permissions
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can update permissions' },
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

    // Check for duplicate name or resource+action combination
    if (name || (resource && action)) {
      let checkQuery = 'SELECT id FROM permissions WHERE (';
      const checkParams: any[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      if (name) {
        conditions.push(`name = $${paramIndex}`);
        checkParams.push(name);
        paramIndex++;
      }

      if (resource && action) {
        conditions.push(`(resource = $${paramIndex} AND action = $${paramIndex + 1})`);
        checkParams.push(resource, action);
        paramIndex += 2;
      }

      checkQuery += conditions.join(' OR ') + `) AND id != $${paramIndex}`;
      checkParams.push(id);

      const duplicateResult = await db.query(checkQuery, checkParams);

      if (duplicateResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Permission with this name or resource+action combination already exists' },
          { status: 409 }
        );
      }
    }

    // Update permission
    const permissionResult = await db.query(
      `UPDATE permissions 
       SET name = COALESCE($1, name),
           resource = COALESCE($2, resource),
           action = COALESCE($3, action),
           description = COALESCE($4, description),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, resource, action, description, id]
    );

    const permission = permissionResult.rows[0];

    // Fetch updated permission with roles
    const updatedPermissionResult = await db.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 CASE WHEN r.id IS NOT NULL THEN 
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 END
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles,
             COALESCE(
               json_agg(r.id) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as role_ids
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      WHERE p.id = $1
      GROUP BY p.id
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

    // Verify user and permissions - 从Authorization头或cookie中获取token
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.cookies.get('session_token')?.value;
    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superusers can delete permissions
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can delete permissions' },
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