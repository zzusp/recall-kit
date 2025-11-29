import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';
import { Permission } from '@/types/database/auth';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface PermissionTreeNode extends Permission {
  children?: PermissionTreeNode[];
  checked?: boolean;
  indeterminate?: boolean;
}

// 构建权限树，并标记选中状态
function buildPermissionTreeWithChecked(
  allPermissions: Permission[],
  assignedPermissionIds: Set<string>
): PermissionTreeNode[] {
  const permissionMap = new Map<string, PermissionTreeNode>();
  const rootNodes: PermissionTreeNode[] = [];

  // 第一遍：创建所有节点的映射
  allPermissions.forEach(permission => {
    const isChecked = assignedPermissionIds.has(permission.id);
    permissionMap.set(permission.id, {
      ...permission,
      children: [],
      checked: isChecked,
      indeterminate: false
    });
  });

  // 第二遍：构建树结构
  allPermissions.forEach(permission => {
    const node = permissionMap.get(permission.id)!;
    
    if (permission.parent_id) {
      const parent = permissionMap.get(permission.parent_id);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }
    } else {
      // 根节点（没有 parent_id）
      rootNodes.push(node);
    }
  });

  // 第三遍：计算 indeterminate 状态（部分选中）
  function calculateIndeterminate(node: PermissionTreeNode): boolean {
    if (!node.children || node.children.length === 0) {
      return false; // 叶子节点没有 indeterminate 状态
    }

    let checkedCount = 0;
    let hasIndeterminate = false;

    node.children.forEach(child => {
      if (calculateIndeterminate(child)) {
        hasIndeterminate = true;
      }
      if (child.checked) {
        checkedCount++;
      }
    });

    if (hasIndeterminate || (checkedCount > 0 && checkedCount < node.children.length)) {
      node.indeterminate = true;
      node.checked = false;
      return true;
    }

    if (checkedCount === node.children.length) {
      node.checked = true;
      node.indeterminate = false;
      return false;
    }

    node.checked = false;
    node.indeterminate = false;
    return false;
  }

  // 对每个节点的子节点进行排序
  function sortChildren(node: PermissionTreeNode) {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => a.sort_order - b.sort_order);
      node.children.forEach(sortChildren);
    }
  }

  rootNodes.forEach(node => {
    sortChildren(node);
    calculateIndeterminate(node);
  });
  rootNodes.sort((a, b) => a.sort_order - b.sort_order);

  return rootNodes;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Check if user has permission to view roles
    if (!currentUser.is_superuser && !hasPermission(session, 'roles.view')) {
      return NextResponse.json(
        { error: '您没有权限查看角色权限' },
        { status: 403 }
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

    // Get all permissions
    const allPermissionsResult = await db.query(`
      SELECT 
        id,
        name,
        code,
        type,
        parent_id,
        page_path,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM permissions
      WHERE is_active = true
      ORDER BY type, sort_order
    `);

    const allPermissions: Permission[] = allPermissionsResult.rows;

    // Get assigned permission IDs for this role
    const assignedPermissionsResult = await db.query(
      'SELECT permission_id FROM role_permissions WHERE role_id = $1',
      [id]
    );

    const assignedPermissionIds = new Set(
      assignedPermissionsResult.rows.map((row: any) => row.permission_id)
    );

    // Build permission tree with checked status
    const tree = buildPermissionTreeWithChecked(allPermissions, assignedPermissionIds);

    return NextResponse.json({
      tree
    });
  } catch (error) {
    console.error('Error fetching role permission tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role permission tree' },
      { status: 500 }
    );
  }
}

