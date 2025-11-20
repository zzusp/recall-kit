'use client';

import { useState, useEffect } from 'react';
import { User, Role } from '@/types/database';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { toast } from '@/lib/services/internal/toastService';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

interface UsersResponse {
  users: (User & {
    roles: Role[];
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function UsersManagement() {
  return (
    <PermissionGuard resource="users" action="view">
      <UsersManagementContent />
    </PermissionGuard>
  );
}

function UsersManagementContent() {
  const [users, setUsers] = useState<UsersResponse['users']>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data: UsersResponse = await response.json();

      setUsers(data.users);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, search]);

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await confirm({
      title: '删除用户',
      message: '确定要删除这个用户吗？删除后无法恢复。',
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchUsers();
      } else {
        toast.error('删除用户失败');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('删除用户失败');
    }
  };

  const getRolesString = (user: UsersResponse['users'][0]) => {
    if (!user.roles || !Array.isArray(user.roles)) {
      return '';
    }
    return user.roles.map(role => role?.name).filter(Boolean).join(', ');
  };

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">用户管理</h1>
          <p className="admin-page-subtitle">管理系统用户账户和权限</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn admin-btn-primary"
        >
          <i className="fas fa-plus"></i>
          新建用户
        </button>
      </div>

      <div className="admin-card">
        <div className="mb-6">
          <div className="relative max-w-md">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
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
            <div className="admin-empty-state-title">加载用户数据中...</div>
            <div className="admin-empty-state-description">请稍候片刻</div>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="admin-empty-state-title">暂无用户数据</div>
            <div className="admin-empty-state-description">
              {search ? '没有找到匹配的用户' : '点击"新建用户"创建第一个用户'}
            </div>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="admin-btn admin-btn-primary mt-4"
              >
                <i className="fas fa-plus"></i>
                新建用户
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>用户信息</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>最后登录</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {getRolesString(user) ? (
                            getRolesString(user).split(', ').map((role, index) => (
                              <span key={index} className="admin-badge admin-badge-success">
                                {role.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="admin-badge admin-badge-warning">未分配角色</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${
                          user.is_active ? 'admin-badge-success' : 'admin-badge-danger'
                        }`}>
                          {user.is_active ? '激活' : '禁用'}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm text-gray-600">
                          {user.last_login_at ? (
                            <>
                              <div>{new Date(user.last_login_at).toLocaleDateString()}</div>
                              <div className="text-gray-400">
                                {new Date(user.last_login_at).toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">从未登录</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="admin-btn admin-btn-outline admin-btn-primary-outline admin-btn-sm"
                          >
                            <i className="fas fa-edit"></i>
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="admin-btn admin-btn-danger admin-btn-sm"
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

      {/* 创建/编辑用户模态框 */}
      {(showCreateModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowCreateModal(false);
            setEditingUser(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// 用户创建/编辑模态框组件
interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: () => void;
}

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    is_active: user?.is_active ?? true,
    is_superuser: user?.is_superuser ?? false,
    roleIds: [] as string[]
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoles();
    if (user) {
      // 获取用户的角色
      fetchUserRoles();
    }
  }, [user]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchUserRoles = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}`);
      const data = await response.json();
      // 处理不同的API响应结构
      const userData = data.user || data;
      const userRoles = userData.user_roles || userData.roles || [];
      const userRoleIds = userRoles.map((ur: any) => ur.roles?.id || ur.id).filter(Boolean);
      setFormData(prev => ({ ...prev, roleIds: userRoleIds }));
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = user ? `/api/admin/users/${user.id}` : '/api/admin/users';
      const method = user ? 'PUT' : 'POST';

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
      console.error('Error saving user:', error);
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <i className={`fas ${user ? 'fa-edit' : 'fa-plus'} text-white`}></i>
              </div>
              {user ? '编辑用户' : '新建用户'}
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
                <i className="fas fa-user text-gray-400"></i>
                用户名
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="admin-form-input"
                placeholder="请输入用户名"
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-envelope text-gray-400"></i>
                邮箱
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="admin-form-input"
                placeholder="请输入邮箱地址"
              />
            </div>

            {!user && (
              <div className="admin-form-group">
                <label className="admin-form-label flex items-center gap-2">
                  <i className="fas fa-lock text-gray-400"></i>
                  密码
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="admin-form-input"
                  placeholder="请输入密码"
                  minLength={6}
                />
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-user-tag text-gray-400"></i>
                角色权限
              </label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                {roles.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    <i className="fas fa-info-circle mb-2"></i>
                    <div>暂无可用角色</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          value={role.id}
                          checked={formData.roleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ 
                                ...prev, 
                                roleIds: [...prev.roleIds, role.id] 
                              }));
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                roleIds: prev.roleIds.filter(id => id !== role.id) 
                              }));
                            }
                          }}
                          className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{role.name}</div>
                          {role.description && (
                            <div className="text-sm text-gray-500">{role.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">激活用户</div>
                    <div className="text-sm text-gray-500">允许用户登录系统</div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_superuser}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_superuser: e.target.checked }))}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">超级用户</div>
                    <div className="text-sm text-gray-500">拥有所有系统权限</div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${formData.is_superuser ? 'bg-red-500' : 'bg-gray-300'}`}></div>
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