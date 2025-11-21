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

    const result = await db.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 CASE WHEN p.id IS NOT NULL THEN 
                   jsonb_build_object('id', p.id, 'name', p.name, 'resource', p.resource, 'action', p.action, 'description', p.description)
                 END
               ) FILTER (WHERE p.id IS NOT NULL), 
               '[]'::json
             ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, is_system_role, permissions, permissionIds } = body;
    
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

    // Only superusers can modify roles
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can modify roles' },
        { status: 403 }
      );
    }

    // Check if role exists
    const existingRoleResult = await db.query(
      'SELECT id, is_system_role FROM roles WHERE id = $1',
      [id]
    );

    if (existingRoleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    const existingRole = existingRoleResult.rows[0];

    // Only superusers can modify system roles, but they cannot change system_role flag
    if (existingRole.is_system_role && !user.is_superuser) {
      return NextResponse.json(
        { error: 'Cannot modify system roles' },
        { status: 403 }
      );
    }

    // Check for duplicate name (excluding current role)
    if (name) {
      const duplicateRoleResult = await db.query(
        'SELECT id FROM roles WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (duplicateRoleResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Role name already exists' },
          { status: 409 }
        );
      }
    }

    // Update role (don't allow changing is_system_role flag)
    const roleResult = await db.query(
      `UPDATE roles 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name, description, id]
    );

    const role = roleResult.rows[0];

    // Update permissions if provided - 支持两种参数名：permissions 或 permissionIds
    const permissionsToUpdate = permissions || permissionIds;
    if (permissionsToUpdate && Array.isArray(permissionsToUpdate)) {
      // Delete existing permissions
      await db.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [id]
      );

      // Insert new permissions
      if (permissionsToUpdate.length > 0) {
        const permissionValues = permissionsToUpdate.map((permissionId: string) => 
          `('${id}', '${permissionId}')`
        ).join(',');
        
        await db.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${permissionValues}`
        );
      }
    }

    // Fetch updated role with permissions
    const updatedRoleResult = await db.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 CASE WHEN p.id IS NOT NULL THEN 
                   jsonb_build_object('id', p.id, 'name', p.name, 'resource', p.resource, 'action', p.action, 'description', p.description)
                 END
               ) FILTER (WHERE p.id IS NOT NULL), 
               '[]'::json
             ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [id]);

    return NextResponse.json(updatedRoleResult.rows[0]);
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Failed to update role' },
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

    // Only superusers can delete roles
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can delete roles' },
        { status: 403 }
      );
    }

    // Check if role exists
    const existingRoleResult = await db.query(
      'SELECT id, is_system_role FROM roles WHERE id = $1',
      [id]
    );

    if (existingRoleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of system roles (even for superusers to protect system integrity)
    if (existingRoleResult.rows[0].is_system_role) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 403 }
      );
    }

    // Delete role (cascade will handle role_permissions and user_roles)
    const result = await db.query(
      'DELETE FROM roles WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}