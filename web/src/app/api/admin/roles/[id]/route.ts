import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

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
    const { id } = params;
    const body = await request.json();
    const { name, description, is_system_role, permissions } = body;

    // Check if role exists
    const existingRoleResult = await db.query(
      'SELECT id FROM roles WHERE id = $1',
      [id]
    );

    if (existingRoleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
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

    // Update role
    const roleResult = await db.query(
      `UPDATE roles 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_system_role = COALESCE($3, is_system_role),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, description, is_system_role, id]
    );

    const role = roleResult.rows[0];

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions
      await db.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [id]
      );

      // Insert new permissions
      if (permissions.length > 0) {
        const permissionValues = permissions.map((permissionId: string) => 
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
    const { id } = params;

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

    // Prevent deletion of system roles
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