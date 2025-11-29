/**
 * 权限树组件单元测试
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PermissionTree from '@/components/admin/PermissionTree';
import { PermissionTreeNode } from '@/components/admin/PermissionTreeNode';

const mockTreeData: PermissionTreeNode[] = [
  {
    id: 'module-1',
    name: '系统管理',
    code: 'system',
    type: 'module',
    parent_id: null,
    page_path: null,
    description: null,
    sort_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
    children: [
      {
        id: 'page-1',
        name: '用户管理',
        code: 'users.page',
        type: 'page',
        parent_id: 'module-1',
        page_path: '/admin/users',
        description: null,
        sort_order: 1,
        is_active: true,
        created_at: '',
        updated_at: '',
        children: [
          {
            id: 'perm-1',
            name: '查看用户列表',
            code: 'users.view',
            type: 'function',
            parent_id: 'page-1',
            page_path: null,
            description: '允许查看用户列表',
            sort_order: 1,
            is_active: true,
            created_at: '',
            updated_at: ''
          }
        ]
      }
    ]
  }
];

describe('PermissionTree', () => {
  it('应该渲染权限树', () => {
    render(<PermissionTree data={mockTreeData} />);
    
    expect(screen.getByText('系统管理')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('查看用户列表')).toBeInTheDocument();
  });

  it('应该支持搜索过滤', () => {
    const { rerender } = render(<PermissionTree data={mockTreeData} searchTerm="用户" />);
    
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('查看用户列表')).toBeInTheDocument();
    
    rerender(<PermissionTree data={mockTreeData} searchTerm="不存在的权限" />);
    
    expect(screen.queryByText('系统管理')).not.toBeInTheDocument();
  });

  it('应该支持复选框模式', () => {
    const handleCheck = jest.fn();
    render(<PermissionTree data={mockTreeData} showCheckbox={true} onCheck={handleCheck} />);
    
    // 应该显示复选框
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('空数据时应该显示提示', () => {
    render(<PermissionTree data={[]} />);
    
    expect(screen.getByText('暂无权限数据')).toBeInTheDocument();
  });
});

