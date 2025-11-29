import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';
import sql from '@/lib/server/db/config';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { permission_ids } = body;

    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // Check if user has permission to assign permissions
    if (!currentUser.is_superuser && !hasPermission(session, 'roles.assign_permissions')) {
      return NextResponse.json(
        { error: '您没有权限分配权限' },
        { status: 403 }
      );
    }

    // Validate input
    if (!Array.isArray(permission_ids)) {
      return NextResponse.json(
        { error: 'permission_ids must be an array' },
        { status: 400 }
      );
    }

    // Check if role exists
    const roleResult = await db.query(
      'SELECT id FROM roles WHERE id = $1',
      [id]
    );

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Validate that all permission IDs exist
    if (permission_ids.length > 0) {
      const permissionCheckResult = await db.query(
        `SELECT id FROM permissions WHERE id = ANY($1) AND is_active = true`,
        [permission_ids]
      );

      if (permissionCheckResult.rows.length !== permission_ids.length) {
        return NextResponse.json(
          { error: 'One or more permission IDs are invalid or inactive' },
          { status: 400 }
        );
      }
    }

    // Use transaction: delete old permissions and insert new ones
    const result = await sql.begin(async (sql) => {
      // Delete all existing role permissions
      await sql`DELETE FROM role_permissions WHERE role_id = ${id}`;

      // Insert new role permissions
      if (permission_ids.length > 0) {
        // Use individual INSERT statements in a loop for batch insert
        // This is safer and more reliable with postgres package
        for (const permissionId of permission_ids) {
          await sql`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (${id}, ${permissionId})
          `;
        }
      }

      // Return updated role with permissions
      const updatedRole = await sql`
        SELECT 
          r.id,
          r.name,
          r.description,
          r.is_system_role,
          r.created_at,
          r.updated_at,
          (
            SELECT COALESCE(
              json_agg(
                jsonb_build_object(
                  'id', p.id,
                  'name', p.name,
                  'code', p.code,
                  'type', p.type,
                  'parent_id', p.parent_id,
                  'page_path', p.page_path,
                  'description', p.description
                )
              ),
              '[]'::json
            )
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = r.id
          ) as permissions
        FROM roles r
        WHERE r.id = ${id}
      `;

      return updatedRole[0];
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error assigning permissions:', error);
    return NextResponse.json(
      { error: 'Failed to assign permissions' },
      { status: 500 }
    );
  }
}

