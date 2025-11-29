import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';
import { Permission } from '@/types/database/auth';

export const runtime = 'nodejs';

interface PermissionTreeNode extends Permission {
  children?: PermissionTreeNode[];
}

// 构建权限树
function buildPermissionTree(permissions: Permission[]): PermissionTreeNode[] {
  const permissionMap = new Map<string, PermissionTreeNode>();
  const rootNodes: PermissionTreeNode[] = [];

  // 第一遍：创建所有节点的映射
  permissions.forEach(permission => {
    permissionMap.set(permission.id, {
      ...permission,
      children: []
    });
  });

  // 第二遍：构建树结构
  permissions.forEach(permission => {
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

  // 对每个节点的子节点进行排序
  function sortChildren(node: PermissionTreeNode) {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => a.sort_order - b.sort_order);
      node.children.forEach(sortChildren);
    }
  }

  rootNodes.forEach(sortChildren);
  rootNodes.sort((a, b) => a.sort_order - b.sort_order);

  return rootNodes;
}

export async function GET(request: NextRequest) {
  try {
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

    // 获取所有权限
    const permissionsResult = await db.query(`
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
      ORDER BY type, sort_order
    `);

    const permissions: Permission[] = permissionsResult.rows;

    // 构建权限树
    const tree = buildPermissionTree(permissions);

    return NextResponse.json({
      tree
    });
  } catch (error) {
    console.error('Error fetching permission tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permission tree' },
      { status: 500 }
    );
  }
}

