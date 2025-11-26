import React, { useState, useEffect } from 'react';
import { toast } from '@/lib/client/services/toast';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions?: Permission[];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPermissions();
    if (role) {
      // 获取角色的权限
      fetchRolePermissions();
    }
  }, [role]);

  useEffect(() => {
    // 初始化所有组为展开状态
    if (permissions.length > 0) {
      const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      }, {} as Record<string, Permission[]>);

      const initialExpanded = Object.keys(groupedPermissions).reduce((acc, resource) => {
        acc[resource] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setExpandedGroups(initialExpanded);
    }
  }, [permissions]);

  const fetchPermissions = async () => {
    try {
      // 不需要手动添加认证头，middleware会自动处理
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
      // 不需要手动添加认证头，middleware会自动处理
      const response = await fetch(`/api/admin/roles/${role.id}`);
      const data = await response.json();
      const rolePermissionIds = (data.permissions || []).map((p: Permission) => p.id);
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

  // 过滤权限
  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce((acc, [resource, resourcePermissions]) => {
    const filteredPermissions = resourcePermissions.filter(permission =>
      permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredPermissions.length > 0) {
      acc[resource] = filteredPermissions;
    }
    return acc;
  }, {} as Record<string, Permission[]>);

  // 切换分组展开状态
  const toggleGroup = (resource: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [resource]: !prev[resource]
    }));
  };

  // 全选/取消全选某个资源组的所有权限
  const toggleGroupPermissions = (resource: string, resourcePermissions: Permission[]) => {
    const permissionIds = resourcePermissions.map(p => p.id);
    const allSelected = permissionIds.every(id => formData.permissionIds.includes(id));
    
    if (allSelected) {
      // 取消全选
      setFormData(prev => ({
        ...prev,
        permissionIds: prev.permissionIds.filter(id => !permissionIds.includes(id))
      }));
    } else {
      // 全选
      setFormData(prev => ({
        ...prev,
        permissionIds: Array.from(new Set([...prev.permissionIds, ...permissionIds]))
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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
              
              {/* 搜索框 */}
              <div className="mb-4">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="搜索权限..."
                  />
                </div>
              </div>

              {/* 权限列表 */}
              <div className="border rounded-lg bg-gray-50">
                {Object.keys(filteredGroupedPermissions).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <i className="fas fa-info-circle mb-2 text-2xl"></i>
                    <div>{searchTerm ? '未找到匹配的权限' : '暂无可用权限'}</div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(filteredGroupedPermissions).map(([resource, resourcePermissions]) => {
                      const isExpanded = expandedGroups[resource];
                      const allSelected = resourcePermissions.every(p => formData.permissionIds.includes(p.id));
                      const selectedCount = resourcePermissions.filter(p => formData.permissionIds.includes(p.id)).length;

                      return (
                        <div key={resource} className="bg-white">
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(resource)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-sm`}></i>
                                </button>
                                <i className="fas fa-layer-group text-blue-500"></i>
                                <h4 className="font-semibold text-gray-900">{resource}</h4>
                                <span className="admin-badge admin-badge-info text-xs">
                                  {selectedCount}/{resourcePermissions.length} 已选择
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleGroupPermissions(resource, resourcePermissions)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {allSelected ? '取消全选' : '全选'}
                              </button>
                            </div>
                            
                            {isExpanded && (
                              <div className="mt-3 space-y-2">
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
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 统计信息 */}
              {permissions.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                  已选择 {formData.permissionIds.length} / {permissions.length} 项权限
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end space-x-3">
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
              onClick={handleSubmit}
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
        </div>
      </div>
    </div>
  );
}

export default RoleModal;