'use client';

import { useState, useEffect } from 'react';
import { Role, Permission } from '@/types/database';
import PermissionGuard from '@/components/auth/PermissionGuard';

interface RolesResponse {
  roles: (Role & {
    user_count: number;
    permissions: Permission[];
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function RolesManagement() {
  return (
    <PermissionGuard resource="roles" action="view">
      <RolesManagementContent />
    </PermissionGuard>
  );
}

function RolesManagementContent() {
  const [roles, setRoles] = useState<RolesResponse['roles']>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/roles?${params}`);
      const data: RolesResponse = await response.json();

      setRoles(data.roles);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, search]);

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.is_system_role) {
      alert('系统角色不能删除');
      return;
    }

    if (!confirm('确定要删除这个角色吗？')) return;

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchRoles();
      } else {
        const error = await response.json();
        alert(error.error || '删除角色失败');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('删除角色失败');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">角色管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          新建角色
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索角色名称或描述..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full max-w-md px-4 py-2 border rounded"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border text-left">角色名称</th>
                  <th className="px-4 py-2 border text-left">描述</th>
                  <th className="px-4 py-2 border text-left">用户数量</th>
                  <th className="px-4 py-2 border text-left">权限数量</th>
                  <th className="px-4 py-2 border text-left">类型</th>
                  <th className="px-4 py-2 border text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border font-medium">{role.name}</td>
                    <td className="px-4 py-2 border">{role.description || '-'}</td>
                    <td className="px-4 py-2 border text-center">{role.user_count}</td>
                    <td className="px-4 py-2 border text-center">{role.permissions.length}</td>
                    <td className="px-4 py-2 border">
                      <span className={`px-2 py-1 rounded text-sm ${
                        role.is_system_role ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {role.is_system_role ? '系统角色' : '自定义角色'}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() => setEditingRole(role)}
                        disabled={role.is_system_role}
                        className="text-blue-500 hover:text-blue-700 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        disabled={role.is_system_role}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1">
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* 创建/编辑角色模态框 */}
      {(showCreateModal || editingRole) && (
        <RoleModal
          role={editingRole}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRole(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingRole(null);
            fetchRoles();
          }}
        />
      )}
    </div>
  );
}

// 角色创建/编辑模态框组件
interface RoleModalProps {
  role: Role | null;
  onClose: () => void;
  onSave: () => void;
}

function RoleModal({ role, onClose, onSave }: RoleModalProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissionIds: [] as string[]
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPermissions();
    if (role) {
      // 获取角色的权限
      fetchRolePermissions();
    }
  }, [role]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchRolePermissions = async () => {
    if (!role) return;
    
    try {
      const response = await fetch(`/api/admin/roles/${role.id}`);
      const data = await response.json();
      const rolePermissionIds = data.role.permissions.map((p: Permission) => p.id);
      setFormData(prev => ({ ...prev, permissionIds: rolePermissionIds }));
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = role ? `/api/admin/roles/${role.id}` : '/api/admin/roles';
      const method = role ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(error.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 按资源分组权限
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {role ? '编辑角色' : '新建角色'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">角色名称</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">权限</label>
            <div className="space-y-4 max-h-60 overflow-y-auto border rounded p-4">
              {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                <div key={resource}>
                  <h4 className="font-medium mb-2 text-gray-700">{resource}</h4>
                  <div className="space-y-1 ml-4">
                    {resourcePermissions.map((permission) => (
                      <label key={permission.id} className="flex items-center">
                        <input
                          type="checkbox"
                          value={permission.id}
                          checked={formData.permissionIds.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ 
                                ...prev, 
                                permissionIds: [...prev.permissionIds, permission.id] 
                              }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                permissionIds: prev.permissionIds.filter(id => id !== permission.id) 
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{permission.action}</span>
                        {permission.description && (
                          <span className="text-xs text-gray-500 ml-2">({permission.description})</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}