'use client';

import { useState, useEffect } from 'react';
import { User, Role } from '@/types/database';
import PermissionGuard from '@/components/auth/PermissionGuard';

interface UsersResponse {
  users: (User & {
    user_roles: { roles: Role }[];
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
    if (!confirm('确定要删除这个用户吗？')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchUsers();
      } else {
        alert('删除用户失败');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('删除用户失败');
    }
  };

  const getRolesString = (user: UsersResponse['users'][0]) => {
    return user.user_roles.map(ur => ur.roles.name).join(', ') || '无角色';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          新建用户
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索用户名或邮箱..."
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
                  <th className="px-4 py-2 border text-left">用户名</th>
                  <th className="px-4 py-2 border text-left">邮箱</th>
                  <th className="px-4 py-2 border text-left">角色</th>
                  <th className="px-4 py-2 border text-left">状态</th>
                  <th className="px-4 py-2 border text-left">最后登录</th>
                  <th className="px-4 py-2 border text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{user.username}</td>
                    <td className="px-4 py-2 border">{user.email}</td>
                    <td className="px-4 py-2 border">{getRolesString(user)}</td>
                    <td className="px-4 py-2 border">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? '激活' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-2 border">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '从未登录'}
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-500 hover:text-red-700"
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
      const userRoleIds = data.user.user_roles.map((ur: any) => ur.roles.id);
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
        alert(error.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {user ? '编辑用户' : '新建用户'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">用户名</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {!user && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">密码</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">角色</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center">
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
                    className="mr-2"
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="mr-2"
              />
              激活用户
            </label>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_superuser}
                onChange={(e) => setFormData(prev => ({ ...prev, is_superuser: e.target.checked }))}
                className="mr-2"
              />
              超级用户
            </label>
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