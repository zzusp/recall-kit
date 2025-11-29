'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/client/services/toast';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Permission } from '@/types/database/auth';
import PermissionTree, { PermissionTreeNode } from '@/components/admin/PermissionTree';
import { apiFetch } from '@/lib/client/services/apiErrorHandler';

interface PermissionTreeResponse {
  tree: PermissionTreeNode[];
}

export default function PermissionsManagement() {
  return (
    <PermissionGuard code="permissions.view">
      <PermissionsManagementContent />
    </PermissionGuard>
  );
}

function PermissionsManagementContent() {
  const [tree, setTree] = useState<PermissionTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<PermissionTreeNode | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [typeFilter, setTypeFilter] = useState<'all' | 'module' | 'page' | 'function'>('all');

  const fetchPermissionTree = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<PermissionTreeResponse>('/api/admin/permissions/tree');
      setTree(data.tree || []);
    } catch (error) {
      // apiFetch 已经处理了 toast 提示
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissionTree();
  }, []);

  const handleSelectNode = (node: PermissionTreeNode) => {
    setSelectedNode(node);
  };

  const handleDeletePermission = async (permissionId: string) => {
    const confirmed = await confirm({
      title: '删除权限',
      message: '确定要删除这个权限吗？如果权限有子节点或已分配给角色，将无法删除。',
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (!confirmed) return;

    try {
      await apiFetch(`/api/admin/permissions/${permissionId}`, {
        method: 'DELETE'
      });
      toast.success('删除成功');
      fetchPermissionTree();
      setSelectedNode(null);
    } catch (error) {
      // apiFetch 已经处理了 toast 提示
    }
  };

  const handleCreatePermission = (parentId?: string) => {
    setEditingPermission(null);
    setShowCreateModal(true);
    // 如果提供了 parentId，可以在表单中预设
    if (parentId) {
      // 这里可以通过其他方式传递 parentId，比如使用状态管理
    }
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setShowCreateModal(true);
  };

  // 过滤树数据
  const filteredTree = tree.filter(node => {
    if (typeFilter !== 'all' && node.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="admin-page-content">
      <ConfirmDialogComponent />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">权限管理</h1>
          <p className="admin-page-subtitle">管理系统权限树结构</p>
        </div>
        <button
          onClick={() => handleCreatePermission()}
          className="admin-btn admin-btn-primary"
        >
          <i className="fas fa-plus"></i>
          新建权限
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：权限树 */}
        <div className="lg:col-span-2">
          <div className="admin-card">
            <div className="mb-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
                  <input
                    type="text"
                    placeholder="搜索权限名称、代码或描述..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="admin-form-select appearance-none"
                    style={{ padding: '0.75rem 2.75rem 0.75rem 1rem' }}
                  >
                    <option value="all">所有类型</option>
                    <option value="module">模块</option>
                    <option value="page">页面</option>
                    <option value="function">功能</option>
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
                <div className="admin-empty-state-title">加载权限树中...</div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <PermissionTree
                  data={filteredTree}
                  onSelect={handleSelectNode}
                  selectedId={selectedNode?.id || null}
                  searchTerm={search}
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧：权限详情 */}
        <div className="lg:col-span-1">
          <div className="admin-card">
            {selectedNode ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">权限详情</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPermission(selectedNode)}
                      className="admin-btn admin-btn-outline admin-btn-primary-outline admin-btn-sm"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDeletePermission(selectedNode.id)}
                      className="admin-btn admin-btn-danger admin-btn-sm"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">权限名称</label>
                    <div className="mt-1 text-gray-900">{selectedNode.name}</div>
                  </div>

                  {selectedNode.code && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">权限代码</label>
                      <div className="mt-1 text-gray-900 font-mono text-sm">{selectedNode.code}</div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-500">权限类型</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedNode.type === 'module' ? 'bg-blue-100 text-blue-800' :
                        selectedNode.type === 'page' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedNode.type === 'module' ? '模块' :
                         selectedNode.type === 'page' ? '页面' : '功能'}
                      </span>
                    </div>
                  </div>

                  {selectedNode.page_path && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">页面路径</label>
                      <div className="mt-1 text-gray-900 font-mono text-sm">{selectedNode.page_path}</div>
                    </div>
                  )}

                  {selectedNode.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">描述</label>
                      <div className="mt-1 text-gray-900">{selectedNode.description}</div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-500">状态</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedNode.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedNode.is_active ? '启用' : '禁用'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-info-circle text-3xl mb-2"></i>
                <p>请从左侧选择权限查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建/编辑权限模态框 */}
      {(showCreateModal || editingPermission) && (
        <PermissionModal
          permission={editingPermission}
          parentId={selectedNode?.id || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPermission(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPermission(null);
            fetchPermissionTree();
          }}
        />
      )}
    </div>
  );
}

// 权限创建/编辑模态框组件
interface PermissionModalProps {
  permission: Permission | null;
  parentId?: string;
  onClose: () => void;
  onSave: () => void;
}

function PermissionModal({ permission, parentId, onClose, onSave }: PermissionModalProps) {
  const [formData, setFormData] = useState({
    name: permission?.name || '',
    code: permission?.code || '',
    type: (permission?.type as 'module' | 'page' | 'function') || 'function',
    parent_id: permission?.parent_id || parentId || null,
    page_path: permission?.page_path || '',
    description: permission?.description || '',
    sort_order: permission?.sort_order || 0,
    is_active: permission?.is_active !== undefined ? permission.is_active : true
  });
  const [loading, setLoading] = useState(false);
  const [parentOptions, setParentOptions] = useState<Permission[]>([]);

  // 获取可用的父节点选项
  useEffect(() => {
    const fetchParentOptions = async () => {
      try {
        const data = await apiFetch<PermissionTreeResponse>('/api/admin/permissions/tree');
        // 展平树结构，根据 type 过滤
        const flattenTree = (nodes: PermissionTreeNode[]): Permission[] => {
          const result: Permission[] = [];
          nodes.forEach(node => {
            if (permission && node.id === permission.id) {
              // 排除当前编辑的节点及其子节点
              return;
            }
            result.push(node);
            if (node.children) {
              result.push(...flattenTree(node.children));
            }
          });
          return result;
        };
        setParentOptions(flattenTree(data.tree));
      } catch (error) {
        // apiFetch 已经处理了 toast 提示
      }
    };
    fetchParentOptions();
  }, [permission]);

  // 根据类型过滤父节点选项
  const getFilteredParentOptions = () => {
    if (formData.type === 'function') {
      return parentOptions.filter(p => p.type === 'page');
    } else if (formData.type === 'page') {
      return parentOptions.filter(p => p.type === 'module');
    } else {
      return parentOptions.filter(p => p.type === 'module' || p.type === null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 验证必填字段
      if (formData.type === 'function' && !formData.code) {
        toast.error('功能类型权限必须填写代码');
        setLoading(false);
        return;
      }
      if (formData.type === 'page' && !formData.page_path) {
        toast.error('页面类型权限必须填写页面路径');
        setLoading(false);
        return;
      }

      const url = permission ? `/api/admin/permissions/${permission.id}` : '/api/admin/permissions';
      const method = permission ? 'PUT' : 'POST';

      await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id || null
        })
      });
      toast.success(permission ? '更新成功' : '创建成功');
      onSave();
    } catch (error) {
      // apiFetch 已经处理了 toast 提示
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
              <label className="admin-form-label">权限类型 *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as 'module' | 'page' | 'function';
                  setFormData(prev => ({
                    ...prev,
                    type: newType,
                    // 切换类型时清空相关字段
                    code: newType !== 'function' ? '' : prev.code,
                    page_path: newType !== 'page' ? '' : prev.page_path,
                    parent_id: newType === 'module' ? null : prev.parent_id
                  }));
                }}
                className="admin-form-select"
                disabled={!!permission}
              >
                <option value="module">模块</option>
                <option value="page">页面</option>
                <option value="function">功能</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">权限名称 *</label>
              <input
                type="text"
                required
                placeholder="例如：查看用户列表"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="admin-form-input"
              />
            </div>

            {formData.type === 'function' && (
              <div className="admin-form-group">
                <label className="admin-form-label">权限代码 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：users.view"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="admin-form-input"
                />
                <p className="text-xs text-gray-500 mt-1">用于权限检查的唯一标识</p>
              </div>
            )}

            {formData.type === 'page' && (
              <div className="admin-form-group">
                <label className="admin-form-label">页面路径 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：/admin/users"
                  value={formData.page_path}
                  onChange={(e) => setFormData(prev => ({ ...prev, page_path: e.target.value }))}
                  className="admin-form-input"
                />
              </div>
            )}

            {(formData.type === 'page' || formData.type === 'function') && (
              <div className="admin-form-group">
                <label className="admin-form-label">父权限</label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
                  className="admin-form-select"
                >
                  <option value="">无（根节点）</option>
                  {getFilteredParentOptions().map(option => (
                    <option key={option.id} value={option.id}>
                      [{option.type}] {option.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label">描述</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="admin-form-input resize-none"
                rows={3}
                placeholder="描述这个权限的作用..."
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">排序顺序</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="admin-form-input"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="mr-2"
                />
                启用
              </label>
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
