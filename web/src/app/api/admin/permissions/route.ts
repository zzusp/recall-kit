import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const resource = searchParams.get('resource');
    
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    // Check if user has permission to view permissions
    if (!currentUser.is_superuser && !hasPermission(session, 'permissions.view')) {
      return NextResponse.json(
        { error: '您没有权限查看权限' },
        { status: 403 }
      );
    }

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause += 'WHERE (name ILIKE $1 OR description ILIKE $1 OR code ILIKE $1 OR page_path ILIKE $1)';
      params.push(`%${search}%`);
    }

    // 注意：resource 参数已废弃，保留以兼容旧代码，但不使用
    // if (resource) {
    //   const operator = whereClause ? 'AND' : 'WHERE';
    //   whereClause += ` ${operator} resource = $${params.length + 1}`;
    //   params.push(resource);
    // }

    // Get all permissions with roles (no pagination) - using subquery to avoid complex GROUP BY
    const permissionsResult = await db.query(`
      SELECT p.*, 
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
      ${whereClause}
      ORDER BY p.type, p.sort_order
    `, params);

    // Add roles_count to each permission
    const permissions = permissionsResult.rows.map(row => ({
      ...row,
      roles_count: Array.isArray(row.role_ids) ? row.role_ids.length : 0
    }));

    return NextResponse.json({
      permissions: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check if user has permission to create permissions
    if (!currentUser.is_superuser && !hasPermission(session, 'permissions.create')) {
      return NextResponse.json(
        { error: '您没有权限创建权限' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type-specific requirements
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

    // Validate parent_id constraints
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
      if (type === 'function' && parentType !== 'page') {
        return NextResponse.json(
          { error: 'Function permissions must have a page as parent' },
          { status: 400 }
        );
      }
      if (type === 'page' && parentType !== 'module') {
        return NextResponse.json(
          { error: 'Page permissions must have a module as parent' },
          { status: 400 }
        );
      }
      if (type === 'module' && parentType && parentType !== 'module') {
        return NextResponse.json(
          { error: 'Module permissions can only have another module or NULL as parent' },
          { status: 400 }
        );
      }
    } else {
      // If no parent_id, type should be module
      if (type !== 'module') {
        return NextResponse.json(
          { error: 'Only module permissions can have NULL parent_id' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate code (if code is provided)
    if (code) {
      const duplicateResult = await db.query(
        'SELECT id FROM permissions WHERE code = $1',
        [code]
      );

      if (duplicateResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Permission with this code already exists' },
          { status: 409 }
        );
      }
    }

    // Create permission
    const permissionResult = await db.query(
      `INSERT INTO permissions (name, code, type, parent_id, page_path, description, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 0), COALESCE($8, true), NOW(), NOW())
       RETURNING *`,
      [name, code, type, parent_id, page_path, description, sort_order, is_active]
    );

    const permission = permissionResult.rows[0];

    // Fetch created permission with roles
    const createdPermissionResult = await db.query(`
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
    `, [permission.id]);

    // Add roles_count to the created permission
    const createdPermission = {
      ...createdPermissionResult.rows[0],
      roles_count: Array.isArray(createdPermissionResult.rows[0]?.role_ids) ? createdPermissionResult.rows[0].role_ids.length : 0
    };

    return NextResponse.json(createdPermission, { status: 201 });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}