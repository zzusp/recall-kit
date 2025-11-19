'use client';

import { useState, useEffect } from 'react';
import { Role, Permission } from '@/types/database';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { toast } from '@/lib/toastService';

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
  const [currentUser, setCurrentUser] = useState<any>(null);

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
    fetchCurrentUser();
  }, [currentPage, search]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.is_system_role) {
      toast.warning('系统角色不能删除');
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
        toast.error(error.error || '删除角色失败');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('删除角色失败');
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">角色管理</h1>
          <p className="admin-page-subtitle">管理系统角色和权限分配</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn admin-btn-primary"
        >
          <i className="fas fa-plus"></i>
          新建角色
        </button>
      </div>

      <div className="admin-card">
        <div className="mb-6">
          <div className="relative max-w-md">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
            <input
              type="text"
              placeholder="搜索角色名称或描述..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="admin-empty-state">
            <div className="admin-loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <div className="admin-empty-state-title">加载角色数据中...</div>
            <div className="admin-empty-state-description">请稍候片刻</div>
          </div>
        ) : roles.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="admin-empty-state-title">暂无角色数据</div>
            <div className="admin-empty-state-description">
              {search ? '没有找到匹配的角色' : '点击"新建角色"创建第一个角色'}
            </div>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="admin-btn admin-btn-primary mt-4"
              >
                <i className="fas fa-plus"></i>
                新建角色
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>角色信息</th>
                    <th>统计信息</th>
                    <th>类型</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            role.is_system_role 
                              ? 'bg-gradient-to-r from-gray-500 to-gray-600' 
                              : 'bg-gradient-to-r from-blue-500 to-purple-600'
                          }`}>
                            <i className={`fas ${role.is_system_role ? 'fa-shield-alt' : 'fa-user-tag'}`}></i>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{role.name}</div>
                            <div className="text-sm text-gray-500">
                              {role.description || '暂无描述'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="admin-badge admin-badge-info">
                              <i className="fas fa-users mr-1"></i>
                              {role.user_count} 用户
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="admin-badge admin-badge-success">
                              <i className="fas fa-key mr-1"></i>
                              {role.permissions.length} 权限
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${
                          role.is_system_role ? 'admin-badge-warning' : 'admin-badge-success'
                        }`}>
                          {role.is_system_role ? '系统角色' : '自定义角色'}
                        </span>
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingRole(role)}
                            disabled={role.is_system_role && !currentUser?.is_superuser}
                            className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              role.is_system_role && !currentUser?.is_superuser 
                                ? "系统角色不可编辑" 
                                : "编辑角色"
                            }
                          >
                            <i className="fas fa-edit"></i>
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={role.is_system_role}
                            className="admin-btn admin-btn-danger admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={role.is_system_role ? "系统角色不可删除" : "删除角色"}
                          >
                            <i className="fas fa-trash"></i>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center space-x-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left"></i>
                  上一页
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>

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
        toast.error(error.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('保存失败');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <i className={`fas ${role ? 'fa-edit' : 'fa-plus'} text-white`}></i>
              </div>
              {role ? '编辑角色' : '新建角色'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-user-tag text-gray-400"></i>
                角色名称
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="admin-form-input"
                placeholder="请输入角色名称"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-align-left text-gray-400"></i>
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="admin-form-input resize-none"
                rows={3}
                placeholder="请输入角色描述"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-key text-gray-400"></i>
                权限配置
              </label>
              <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50">
                {Object.keys(groupedPermissions).length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    <i className="fas fa-info-circle mb-2"></i>
                    <div>暂无可用权限</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
                      <div key={resource} className="bg-white rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-3">
                          <i className="fas fa-layer-group text-blue-500"></i>
                          <h4 className="font-semibold text-gray-900">{resource}</h4>
                          <span className="admin-badge admin-badge-info text-xs">
                            {resourcePermissions.length} 项权限
                          </span>
                        </div>
                        <div className="space-y-2">
                          {resourcePermissions.map((permission) => (
                            <label key={permission.id} className="flex items-start p-3 hover:bg-blue-50 rounded cursor-pointer transition-colors">
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
                                className="mr-3 mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">{permission.action}</div>
                                {permission.description && (
                                  <div className="text-xs text-gray-500 mt-1">{permission.description}</div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="admin-btn admin-btn-outline"
              >
                <i className="fas fa-times mr-2"></i>
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="admin-btn admin-btn-primary"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    保存中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    保存
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}