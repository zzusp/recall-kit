'use client';

import { useState, useEffect } from 'react';
import { Role, Permission } from '@/types/database';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { toast } from '@/lib/toastService';
import RoleModal from './RoleModalImproved';

interface RolesResponse {
  roles: (Role & {
    user_count: number;
    permissions: Permission[];
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function RolesManagementContent() {
  const [roles, setRoles] = useState<RolesResponse['roles']>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<RolesResponse['pagination']>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRoles();
  }, [pagination.page, searchTerm]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm })
      });

      // 不需要手动添加认证头，middleware会自动处理
      const response = await fetch(`/api/admin/roles?${params}`);
      const data = await response.json();

      setRoles(data.roles || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('确定要删除这个角色吗？删除后无法恢复。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('角色删除成功');
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('删除失败');
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingRole(null);
  };

  const handleModalSave = () => {
    fetchRoles();
    handleModalClose();
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">角色管理</h1>
          <p className="admin-page-subtitle">管理系统用户角色和权限分配</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn admin-btn-primary"
        >
          <i className="fas fa-plus mr-2"></i>
          新建角色
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="admin-search-bar">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input pl-10"
            placeholder="搜索角色名称..."
          />
        </div>
      </div>

      {/* 角色列表 */}
      {loading ? (
        <div className="text-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-500 mb-2"></i>
          <div>加载中...</div>
        </div>
      ) : roles.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fas fa-users-slash text-4xl text-gray-300 mb-4"></i>
          <h3>暂无角色</h3>
          <p className="text-gray-500 mt-2">还没有创建任何角色，点击上方按钮创建第一个角色。</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="admin-btn admin-btn-primary mt-4"
          >
            <i className="fas fa-plus mr-2"></i>
            创建角色
          </button>
        </div>
      ) : (
        <div className="admin-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">角色名称</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">描述</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">用户数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">权限数</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{role.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-600">
                        {role.description || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium">{role.user_count}</span>
                        <span className="text-xs text-gray-500 ml-1">用户</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <i className="fas fa-key mr-1"></i>
                        {role.permissions.length} 权限
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="编辑"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="删除"
                          disabled={role.user_count > 0}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-700">
                显示 {((pagination.page - 1) * pagination.limit) + 1} 到{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
                共 {pagination.total} 条记录
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="admin-btn admin-btn-outline"
                >
                  <i className="fas fa-chevron-left mr-1"></i>
                  上一页
                </button>
                <span className="text-sm text-gray-700">
                  第 {pagination.page} / {pagination.totalPages} 页
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="admin-btn admin-btn-outline"
                >
                  下一页
                  <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 创建/编辑角色模态框 */}
      {(showCreateModal || editingRole) && (
        <RoleModal
          role={editingRole}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <PermissionGuard resource="roles" action="view">
      <RolesManagementContent />
    </PermissionGuard>
  );
}