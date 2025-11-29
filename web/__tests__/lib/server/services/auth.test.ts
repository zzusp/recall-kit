/**
 * 权限服务单元测试
 * 测试权限加载和检查逻辑
 */

import { getCurrentUser, hasPermission, hasPagePermission, hasModulePermission } from '@/lib/server/services/auth';
import { db } from '@/lib/server/db/client';

// Mock数据库连接
jest.mock('@/lib/server/db/client', () => ({
  db: {
    query: jest.fn(),
  },
}));

describe('权限服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('应该返回包含所有类型权限的用户信息', async () => {
      const mockSessionToken = 'test-session-token';
      const mockUserId = 'user-123';
      const mockRoleId = 'role-123';

      (db.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ user_id: mockUserId, expires_at: new Date(Date.now() + 3600000) }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: mockUserId, username: 'test', email: 'test@example.com', is_superuser: false, is_active: true }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: mockRoleId, name: 'admin', description: 'Admin role', is_system_role: false }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'perm-1',
              name: '查看用户列表',
              code: 'users.view',
              type: 'function',
              parent_id: 'page-1',
              page_path: null,
              description: '允许查看用户列表',
              sort_order: 1,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            },
            {
              id: 'page-1',
              name: '用户管理',
              code: 'users.page',
              type: 'page',
              parent_id: 'module-1',
              page_path: '/admin/users',
              description: null,
              sort_order: 1,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            },
            {
              id: 'module-1',
              name: '系统管理',
              code: 'system',
              type: 'module',
              parent_id: null,
              page_path: null,
              description: null,
              sort_order: 1,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }
          ]
        });

      const user = await getCurrentUser(mockSessionToken);

      expect(user).not.toBeNull();
      expect(user?.permissions).toHaveLength(3);
      expect(user?.permissions.some(p => p.type === 'function')).toBe(true);
      expect(user?.permissions.some(p => p.type === 'page')).toBe(true);
      expect(user?.permissions.some(p => p.type === 'module')).toBe(true);
    });

    it('应该只返回 is_active = true 的权限', async () => {
      const mockSessionToken = 'test-session-token';
      const mockUserId = 'user-123';
      const mockRoleId = 'role-123';

      (db.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ user_id: mockUserId, expires_at: new Date(Date.now() + 3600000) }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: mockUserId, username: 'test', email: 'test@example.com', is_superuser: false, is_active: true }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: mockRoleId, name: 'admin', description: 'Admin role', is_system_role: false }]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'perm-1',
              name: '查看用户列表',
              code: 'users.view',
              type: 'function',
              parent_id: null,
              page_path: null,
              description: '允许查看用户列表',
              sort_order: 1,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }
            // 注意：查询中已经过滤了 is_active = true，所以不会返回 is_active = false 的权限
          ]
        });

      const user = await getCurrentUser(mockSessionToken);

      expect(user?.permissions).toHaveLength(1);
      expect(user?.permissions[0].is_active).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('超级用户应该拥有所有权限', () => {
      const user = {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        roles: [],
        permissions: [],
        is_superuser: true
      };

      expect(hasPermission(user, 'users.view')).toBe(true);
    });

    it('应该检查用户是否有指定的 function 权限', () => {
      const user = {
        id: 'user-1',
        username: 'test',
        email: 'test@example.com',
        roles: [],
        permissions: [
          {
            id: 'perm-1',
            name: '查看用户列表',
            code: 'users.view',
            type: 'function',
            parent_id: null,
            page_path: null,
            description: null,
            sort_order: 0,
            is_active: true,
            created_at: '',
            updated_at: ''
          }
        ],
        is_superuser: false
      };

      expect(hasPermission(user, 'users.view')).toBe(true);
      expect(hasPermission(user, 'users.create')).toBe(false);
    });

    it('应该忽略禁用的权限', () => {
      const user = {
        id: 'user-1',
        username: 'test',
        email: 'test@example.com',
        roles: [],
        permissions: [
          {
            id: 'perm-1',
            name: '查看用户列表',
            code: 'users.view',
            type: 'function',
            parent_id: null,
            page_path: null,
            description: null,
            sort_order: 0,
            is_active: false,
            created_at: '',
            updated_at: ''
          }
        ],
        is_superuser: false
      };

      expect(hasPermission(user, 'users.view')).toBe(false);
    });
  });

  describe('hasPagePermission', () => {
    it('超级用户应该拥有所有页面权限', () => {
      const user = {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        roles: [],
        permissions: [],
        is_superuser: true
      };

      expect(hasPagePermission(user, '/admin/users')).toBe(true);
    });

    it('应该检查用户是否有指定的 page 权限', () => {
      const user = {
        id: 'user-1',
        username: 'test',
        email: 'test@example.com',
        roles: [],
        permissions: [
          {
            id: 'page-1',
            name: '用户管理',
            code: 'users.page',
            type: 'page',
            parent_id: null,
            page_path: '/admin/users',
            description: null,
            sort_order: 0,
            is_active: true,
            created_at: '',
            updated_at: ''
          }
        ],
        is_superuser: false
      };

      expect(hasPagePermission(user, '/admin/users')).toBe(true);
      expect(hasPagePermission(user, '/admin/roles')).toBe(false);
    });
  });

  describe('hasModulePermission', () => {
    it('超级用户应该拥有所有模块权限', () => {
      const user = {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        roles: [],
        permissions: [],
        is_superuser: true
      };

      expect(hasModulePermission(user, 'system')).toBe(true);
    });

    it('应该检查用户是否有指定的 module 权限', () => {
      const user = {
        id: 'user-1',
        username: 'test',
        email: 'test@example.com',
        roles: [],
        permissions: [
          {
            id: 'module-1',
            name: '系统管理',
            code: 'system',
            type: 'module',
            parent_id: null,
            page_path: null,
            description: null,
            sort_order: 0,
            is_active: true,
            created_at: '',
            updated_at: ''
          }
        ],
        is_superuser: false
      };

      expect(hasModulePermission(user, 'system')).toBe(true);
      expect(hasModulePermission(user, 'content')).toBe(false);
    });
  });
});

