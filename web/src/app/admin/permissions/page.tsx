'use client';

import { useState, useEffect } from 'react';
import { Permission, Role } from '@/types/database';
import PermissionGuard from '@/components/auth/PermissionGuard';

interface PermissionsResponse {
  permissions: (Permission & {
    roles_count: number;
    roles: Role[];
  })[];
}

export default function PermissionsManagement() {
  return (
    <PermissionGuard resource="permissions" action="view">
      <PermissionsManagementContent />
    </PermissionGuard>
  );
}

function PermissionsManagementContent() {
  const [permissions, setPermissions] = useState<PermissionsResponse['permissions']>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [resources, setResources] = useState<string[]>([]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(resourceFilter && { resource: resourceFilter })
      });

      const response = await fetch(`/api/admin/permissions?${params}`);
      const data: PermissionsResponse = await response.json();

      setPermissions(data.permissions);
      
      // 提取所有资源类型
      const uniqueResources = Array.from(new Set(data.permissions.map(p => p.resource)));
      setResources(uniqueResources);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [search, resourceFilter]);

  const handleDeletePermission = async (permissionId: string) => {
    const permission = permissions.find(p => p.id === permissionId);
    if (permission?.roles_count > 0) {
      alert('该权限已分配给角色，不能删除');
      return;
    }

    if (!confirm('确定要删除这个权限吗？')) return;

    try {
      const response = await fetch(`/api/admin/permissions/${permissionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchPermissions();
      } else {
        const error = await response.json();
        alert(error.error || '删除权限失败');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      alert('删除权限失败');
    }
  };

  const getRolesString = (permission: PermissionsResponse['permissions'][0]) => {
    return permission.roles.map(r => r.name).join(', ') || '未分配';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">权限管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          新建权限
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="搜索权限名称、资源或操作..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          />
        </div>
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">所有资源</option>
          {resources.map(resource => (
            <option key={resource} value={resource}>{resource}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-left">权限名称</th>
                <th className="px-4 py-2 border text-left">资源</th>
                <th className="px-4 py-2 border text-left">操作</th>
                <th className="px-4 py-2 border text-left">描述</th>
                <th className="px-4 py-2 border text-left">分配角色</th>
                <th className="px-4 py-2 border text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border font-medium">{permission.name}</td>
                  <td className="px-4 py-2 border">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {permission.resource}
                    </span>
                  </td>
                  <td className="px-4 py-2 border">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                      {permission.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 border">{permission.description || '-'}</td>
                  <td className="px-4 py-2 border">
                    <div className="text-sm">
                      <div>{getRolesString(permission)}</div>
                      <div className="text-gray-500">({permission.roles_count} 个角色)</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 border">
                    <button
                      onClick={() => setEditingPermission(permission)}
                      className="text-blue-500 hover:text-blue-700 mr-2"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeletePermission(permission.id)}
                      disabled={permission.roles_count > 0}
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
      )}

      {/* 创建/编辑权限模态框 */}
      {(showCreateModal || editingPermission) && (
        <PermissionModal
          permission={editingPermission}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPermission(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPermission(null);
            fetchPermissions();
          }}
        />
      )}
    </div>
  );
}

// 权限创建/编辑模态框组件
interface PermissionModalProps {
  permission: Permission | null;
  onClose: () => void;
  onSave: () => void;
}

function PermissionModal({ permission, onClose, onSave }: PermissionModalProps) {
  const [formData, setFormData] = useState({
    name: permission?.name || '',
    resource: permission?.resource || '',
    action: permission?.action || '',
    description: permission?.description || ''
  });
  const [loading, setLoading] = useState(false);

  // 常见的资源和操作选项
  const commonResources = [
    'users', 'roles', 'permissions', 'experiences', 'admin'
  ];

  const commonActions = [
    'view', 'create', 'edit', 'delete', 'publish', 'review', 'activate', 'assign', 'dashboard', 'settings', 'logs'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = permission ? `/api/admin/permissions/${permission.id}` : '/api/admin/permissions';
      const method = permission ? 'PUT' : 'POST';

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
      console.error('Error saving permission:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {permission ? '编辑权限' : '新建权限'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">权限名称</label>
            <input
              type="text"
              required
              placeholder="例如：users.view"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">资源</label>
            <select
              required
              value={formData.resource}
              onChange={(e) => setFormData(prev => ({ ...prev, resource: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">选择资源</option>
              {commonResources.map(resource => (
                <option key={resource} value={resource}>{resource}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="或输入自定义资源"
              value={formData.resource}
              onChange={(e) => setFormData(prev => ({ ...prev, resource: e.target.value }))}
              className="w-full px-3 py-2 border rounded mt-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">操作</label>
            <select
              required
              value={formData.action}
              onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">选择操作</option>
              {commonActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="或输入自定义操作"
              value={formData.action}
              onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
              className="w-full px-3 py-2 border rounded mt-2"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder="描述这个权限的作用..."
            />
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