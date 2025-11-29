import React, { useState, useEffect } from 'react';
import { toast } from '@/lib/client/services/toast';
import PermissionTree, { PermissionTreeNode } from './PermissionTree';
import { getApiUrl } from '@/config/paths';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions?: any[];
}

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
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPermissionTree();
    if (role) {
      fetchRolePermissions();
    }
  }, [role]);

  const fetchPermissionTree = async () => {
    try {
      setTreeLoading(true);
      
      if (role) {
        // 编辑角色：获取带选中状态的权限树
        const response = await fetch(getApiUrl(`/api/admin/roles/${role.id}/permissions/tree`));
        if (response.ok) {
          const data = await response.json();
          setPermissionTree(data.tree || []);
          
          // 提取所有选中的权限ID
          const extractCheckedIds = (nodes: PermissionTreeNode[]): string[] => {
            const ids: string[] = [];
            nodes.forEach(node => {
              if (node.checked) {
                ids.push(node.id);
              }
              if (node.children) {
                ids.push(...extractCheckedIds(node.children));
              }
            });
            return ids;
          };
          
          const checkedIds = extractCheckedIds(data.tree || []);
          setFormData(prev => ({ ...prev, permissionIds: checkedIds }));
        }
      } else {
        // 新建角色：获取完整的权限树（未选中状态）
        const treeResponse = await fetch(getApiUrl('/api/admin/permissions/tree'));
        if (treeResponse.ok) {
          const treeData = await treeResponse.json();
          setPermissionTree(treeData.tree || []);
        }
      }
    } catch (error) {
      console.error('Error fetching permission tree:', error);
      toast.error('获取权限树失败');
    } finally {
      setTreeLoading(false);
    }
  };

  const fetchRolePermissions = async () => {
    if (!role) return;
    
    try {
      const response = await fetch(getApiUrl(`/api/admin/roles/${role.id}/permissions/tree`));
      if (response.ok) {
        const data = await response.json();
        setPermissionTree(data.tree || []);
        
        // 提取所有选中的权限ID
        const extractCheckedIds = (nodes: PermissionTreeNode[]): string[] => {
          const ids: string[] = [];
          nodes.forEach(node => {
            if (node.checked) {
              ids.push(node.id);
            }
            if (node.children) {
              ids.push(...extractCheckedIds(node.children));
            }
          });
          return ids;
        };
        
        const checkedIds = extractCheckedIds(data.tree || []);
        setFormData(prev => ({ ...prev, permissionIds: checkedIds }));
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  // 处理权限复选框变化
  const handleCheck = (node: PermissionTreeNode, checked: boolean) => {
    // 递归更新节点及其所有子节点的选中状态
    const updateNodeAndAllDescendants = (targetNode: PermissionTreeNode, isChecked: boolean): PermissionTreeNode => {
      const updatedNode = {
        ...targetNode,
        checked: isChecked,
        indeterminate: false
      };
      
      // 递归更新所有子节点
      if (targetNode.children && targetNode.children.length > 0) {
        updatedNode.children = targetNode.children.map(child => 
          updateNodeAndAllDescendants(child, isChecked)
        );
      }
      
      return updatedNode;
    };

    // 在树中查找并更新目标节点
    const updateNodeInTree = (nodes: PermissionTreeNode[]): PermissionTreeNode[] => {
      return nodes.map(n => {
        if (n.id === node.id) {
          // 找到目标节点，更新它及其所有子节点
          return updateNodeAndAllDescendants(n, checked);
        }
        if (n.children && n.children.length > 0) {
          // 递归查找子节点
          return {
            ...n,
            children: updateNodeInTree(n.children)
          };
        }
        return n;
      });
    };

    let updatedTree = updateNodeInTree(permissionTree);

    // 更新父节点的选中状态（向上传播）
    // 父节点的状态完全基于子节点：
    // - 如果所有子节点都被选中，父节点应该是 checked
    // - 如果部分子节点被选中，父节点应该是 indeterminate
    // - 如果没有任何子节点被选中，父节点应该是 unchecked
    // 注意：如果父节点本身被直接选中（用户点击了父节点的复选框），它的 checked 状态已经在 updateNodeAndAllDescendants 中设置了
    const updateParentStates = (nodes: PermissionTreeNode[]): PermissionTreeNode[] => {
      return nodes.map(n => {
        if (n.children && n.children.length > 0) {
          // 先递归更新子节点的父节点状态
          const updatedChildren = updateParentStates(n.children);
          
          // 检查父节点是否被直接选中（用户点击了这个节点）
          const isDirectlyChecked = n.id === node.id;
          
          // 计算子节点的状态
          const allChildrenChecked = updatedChildren.every(c => c.checked === true);
          const someChildrenChecked = updatedChildren.some(c => c.checked === true || c.indeterminate === true);
          
          // 父节点的状态：
          // - 如果父节点被直接选中，保持选中状态
          // - 否则，如果所有子节点都被选中，父节点也应该是选中状态
          // - 如果部分子节点被选中，父节点应该是 indeterminate 状态
          // - 如果没有任何子节点被选中，父节点应该是未选中状态
          let finalChecked = false;
          let finalIndeterminate = false;
          
          if (isDirectlyChecked) {
            // 父节点被直接选中，保持选中状态
            finalChecked = true;
            finalIndeterminate = false;
          } else if (allChildrenChecked) {
            // 所有子节点都被选中，父节点也应该是选中状态
            finalChecked = true;
            finalIndeterminate = false;
          } else if (someChildrenChecked) {
            // 部分子节点被选中，父节点应该是 indeterminate 状态
            finalChecked = false;
            finalIndeterminate = true;
          } else {
            // 没有任何子节点被选中，父节点应该是未选中状态
            finalChecked = false;
            finalIndeterminate = false;
          }
          
          return {
            ...n,
            children: updatedChildren,
            checked: finalChecked,
            indeterminate: finalIndeterminate
          };
        }
        // 叶子节点，保持原状态（checked 状态已经在 updateNodeAndAllDescendants 中设置）
        return n;
      });
    };

    updatedTree = updateParentStates(updatedTree);
    setPermissionTree(updatedTree);
    
    // 更新选中的权限ID列表（只收集 checked === true 的节点，不包括 indeterminate 的节点）
    const extractCheckedIds = (nodes: PermissionTreeNode[]): string[] => {
      const ids: string[] = [];
      nodes.forEach(n => {
        // 只收集明确选中的节点（checked === true），不包括 indeterminate 的节点
        if (n.checked === true) {
          ids.push(n.id);
        }
        if (n.children && n.children.length > 0) {
          ids.push(...extractCheckedIds(n.children));
        }
      });
      return ids;
    };
    
    const checkedIds = extractCheckedIds(updatedTree);
    setFormData(prev => ({ ...prev, permissionIds: checkedIds }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = role ? `/api/admin/roles/${role.id}` : '/api/admin/roles';
      const method = role ? 'PUT' : 'POST';

      // 先保存角色基本信息
      const roleResponse = await fetch(getApiUrl(url), {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      if (!roleResponse.ok) {
        const error = await roleResponse.json();
        toast.error(error.error || '保存角色失败');
        setLoading(false);
        return;
      }

      const roleData = await roleResponse.json();
      const roleId = roleData.id || role?.id;

      // 然后分配权限
      const permissionResponse = await fetch(getApiUrl(`/api/admin/roles/${roleId}/permissions`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permission_ids: formData.permissionIds
        })
      });

      if (permissionResponse.ok) {
        toast.success('保存成功');
        onSave();
      } else {
        const error = await permissionResponse.json();
        toast.error(error.error || '分配权限失败');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
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
                value={formData.description || ''}
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

              {/* 权限树 */}
              <div className="border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                {treeLoading ? (
                  <div className="text-center text-gray-500 py-8">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <div>加载权限树中...</div>
                  </div>
                ) : (
                  <PermissionTree
                    data={permissionTree}
                    onCheck={handleCheck}
                    showCheckbox={true}
                    searchTerm={searchTerm}
                  />
                )}
              </div>

              {/* 统计信息 */}
              {formData.permissionIds.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                  已选择 {formData.permissionIds.length} 项权限
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
