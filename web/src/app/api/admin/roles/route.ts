import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // Check if user has permission to view roles
    if (!currentUser.is_superuser && !hasPermission(session, 'roles.view')) {
      return NextResponse.json(
        { error: '您没有权限查看角色' },
        { status: 403 }
      );
    }

    // Build WHERE clause for search
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = 'WHERE name ILIKE $1 OR description ILIKE $1';
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM roles ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get roles with permissions - using subquery to avoid complex GROUP BY
    const rolesResult = await db.query(`
      SELECT r.*, 
             (
               SELECT COALESCE(
                 json_agg(
                   jsonb_build_object('id', p.id, 'name', p.name, 'code', p.code, 'type', p.type, 'parent_id', p.parent_id, 'page_path', p.page_path, 'description', p.description)
                 ),
                 '[]'::json
               )
               FROM role_permissions rp
               JOIN permissions p ON rp.permission_id = p.id
               WHERE rp.role_id = r.id
             ) as permissions
      FROM roles r
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return NextResponse.json({
      roles: rolesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions, permissionIds } = body;
    
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // Check if user has permission to create roles
    if (!currentUser.is_superuser && !hasPermission(session, 'roles.create')) {
      return NextResponse.json(
        { error: '您没有权限创建角色' },
        { status: 403 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRoleResult = await db.query(
      'SELECT id FROM roles WHERE name = $1',
      [name]
    );

    if (existingRoleResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 409 }
      );
    }

    // Create role
    const roleResult = await db.query(
      `INSERT INTO roles (name, description, is_system_role, created_at, updated_at)
       VALUES ($1, $2, false, NOW(), NOW())
       RETURNING *`,
      [name, description]
    );

    const role = roleResult.rows[0];

    // Assign permissions if provided - 支持两种参数名：permissions 或 permissionIds
    const permissionsToAssign = permissions || permissionIds || [];
    if (permissionsToAssign && Array.isArray(permissionsToAssign) && permissionsToAssign.length > 0) {
      const permissionValues = permissionsToAssign.map((permissionId: string) => 
        `('${role.id}', '${permissionId}')`
      ).join(',');
      
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${permissionValues}`
      );
    }

    // Fetch created role with permissions - using subquery to avoid complex GROUP BY
    const createdRoleResult = await db.query(`
      SELECT r.*, 
             (
               SELECT COALESCE(
                 json_agg(
                   jsonb_build_object('id', p.id, 'name', p.name, 'code', p.code, 'type', p.type, 'parent_id', p.parent_id, 'page_path', p.page_path, 'description', p.description)
                 ),
                 '[]'::json
               )
               FROM role_permissions rp
               JOIN permissions p ON rp.permission_id = p.id
               WHERE rp.role_id = r.id
             ) as permissions
      FROM roles r
      WHERE r.id = $1
    `, [role.id]);

    return NextResponse.json(createdRoleResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
