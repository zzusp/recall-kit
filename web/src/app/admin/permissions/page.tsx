'use client';
import { useState, useEffect } from 'react';
import { getSessionToken } from '@/lib/client/services/auth';
import { toast } from '@/lib/client/services/toast';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Permission, Role } from '@/types/database/auth';

interface PermissionsResponse {
  permissions: (Permission & {
    roles_count?: number;
    roles?: Role[];
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [resources, setResources] = useState<string[]>([]);
  const [resourceFilter, setResourceFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchPermissions = async (page?: number) => {
    try {
      setLoading(true);
      const currentPage = page || pagination.page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(resourceFilter && { resource: resourceFilter })
      });

      const response = await fetch(`/api/admin/permissions?${params}`);
      const data = await response.json();

      // 确保数据结构正确
      if (data && data.permissions) {
        setPermissions(data.permissions);
        
        // 安全地设置pagination，提供默认值
        if (data.pagination) {
          setPagination({
            page: data.pagination.page || 1,
            limit: data.pagination.limit || 10,
            total: data.pagination.total || 0,
            totalPages: data.pagination.totalPages || 0
          });
        } else {
          // 如果没有pagination数据，保持当前状态
          console.warn('No pagination data received from API');
        }
        
        // 提取所有资源类型
        if (Array.isArray(data.permissions)) {
          const uniqueResources = Array.from(new Set(data.permissions.map((p: Permission) => p.resource)));
          setResources(uniqueResources as string[]);
        } else {
          setResources([]);
        }
      } else {
        // 如果API返回的数据结构不正确，设置为空状态
        console.error('Invalid data structure received from API:', data);
        setPermissions([]);
        setPagination(prev => ({
          ...prev,
          totalPages: 0,
          total: 0
        }));
        setResources([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // 出错时设置为空状态
      setPermissions([]);
      setPagination(prev => ({
        ...prev,
        totalPages: 0,
        total: 0
      }));
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPermissions(1);
  }, [search, resourceFilter]);

  const handleDeletePermission = async (permissionId: string) => {
    const confirmed = await confirm({
      title: '删除权限',
      message: '确定要删除这个权限吗？删除后无法恢复。',
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/permissions/${permissionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchPermissions();
      } else {
        const error = await response.json();
        toast.error(error.error || '删除权限失败');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('删除权限失败');
    }
  };

  const getRolesString = (permission: PermissionsResponse['permissions'][0]) => {
    return permission.roles?.map((r: Role) => r.name).join(', ') || '未分配';
  };

  return (
    <div className="admin-page-content">
      <ConfirmDialogComponent />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">权限管理</h1>
          <p className="admin-page-subtitle">管理系统权限和角色分配</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn admin-btn-primary"
        >
          <i className="fas fa-plus"></i>
          新建权限
        </button>
      </div>

      <div className="admin-card">
        <div className="mb-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
              <input
                type="text"
                placeholder="搜索权限名称、资源或操作..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <div className="relative">
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="admin-form-select appearance-none pr-10"
              >
                <option value="">所有资源</option>
                {resources.map(resource => (
                  <option key={resource} value={resource}>{resource}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty-state">
            <div className="admin-loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <div className="admin-empty-state-title">加载权限数据中...</div>
            <div className="admin-empty-state-description">请稍候片刻</div>
          </div>
        ) : !permissions || permissions.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <i className="fas fa-key"></i>
            </div>
            <div className="admin-empty-state-title">暂无权限数据</div>
            <div className="admin-empty-state-description">
              {search || resourceFilter ? '没有找到匹配的权限' : '点击"新建权限"创建第一个权限'}
            </div>
            {!search && !resourceFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="admin-btn admin-btn-primary mt-4"
              >
                <i className="fas fa-plus"></i>
                新建权限
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>权限信息</th>
                  <th>资源与操作</th>
                  <th>分配角色</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.id}>
                    <td>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white font-semibold">
                          <i className="fas fa-key"></i>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{permission.name}</div>
                          <div className="text-sm text-gray-500">
                            {permission.description || '暂无描述'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="admin-badge admin-badge-info">
                            <i className="fas fa-database mr-1"></i>
                            {permission.resource}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="admin-badge admin-badge-success">
                            <i className="fas fa-cog mr-1"></i>
                            {permission.action}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">
                          {getRolesString(permission)}
                        </div>
                        <div className="text-gray-500">
                          {permission.roles_count} 个角色
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-action-buttons">
                        <button
                          onClick={() => setEditingPermission(permission)}
                          className="admin-btn admin-btn-outline admin-btn-primary-outline admin-btn-sm"
                        >
                          <i className="fas fa-edit"></i>
                          编辑
                        </button>
<button
  onClick={() => handleDeletePermission(permission.id)}
  disabled={permission.roles_count !== undefined && permission.roles_count > 0}
  className="admin-btn admin-btn-danger admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
  title={permission.roles_count !== undefined && permission.roles_count > 0 ? "该权限已分配给角色，不能删除" : "删除权限"}
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
        )}
        
        {/* 分页组件 */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示第 {((pagination.page - 1) * pagination.limit) + 1} 到 {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
              共 {pagination.total} 条记录
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchPermissions(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => fetchPermissions(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      pageNum === pagination.page
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => fetchPermissions(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

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
    'view', 'create', 'edit', 'delete', 'publish', 'activate', 'assign', 'dashboard', 'settings', 'logs'
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
        toast.error(error.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving permission:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                <i className={`fas ${permission ? 'fa-edit' : 'fa-plus'} text-white`}></i>
              </div>
              {permission ? '编辑权限' : '新建权限'}
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
                <i className="fas fa-key text-gray-400"></i>
                权限名称
              </label>
              <input
                type="text"
                required
                placeholder="例如：users.view"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="admin-form-input"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-database text-gray-400"></i>
                资源
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <select
                    required
                    value={formData.resource}
                    onChange={(e) => setFormData(prev => ({ ...prev, resource: e.target.value }))}
                    className="admin-form-select appearance-none pr-10"
                  >
                    <option value="">选择资源</option>
                    {commonResources.map(resource => (
                      <option key={resource} value={resource}>{resource}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                </div>
                <input
                  type="text"
                  placeholder="或输入自定义资源"
                  value={formData.resource}
                  onChange={(e) => setFormData(prev => ({ ...prev, resource: e.target.value }))}
                  className="admin-form-input"
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-cog text-gray-400"></i>
                操作
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <select
                    required
                    value={formData.action}
                    onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                    className="admin-form-select appearance-none pr-10"
                  >
                    <option value="">选择操作</option>
                    {commonActions.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                </div>
                <input
                  type="text"
                  placeholder="或输入自定义操作"
                  value={formData.action}
                  onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                  className="admin-form-input"
                />
              </div>
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
                placeholder="描述这个权限的作用..."
              />
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