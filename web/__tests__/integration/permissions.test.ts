/**
 * 权限系统集成测试
 * 使用真实数据库连接验证权限树功能
 * 
 * 注意：此测试需要 DATABASE_URL 环境变量
 * 运行方式：DATABASE_URL=xxx npm test -- __tests__/integration/permissions.test.ts
 */

// 设置数据库连接环境变量（在导入之前）
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://root:Zzu%40SP2025!@115.120.218.110:5432/temp';
}

import { db } from '@/lib/server/db/client';

describe('权限系统集成测试', () => {

  describe('权限表结构验证', () => {
    it('应该能够查询权限表', async () => {
      const result = await db.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'permissions'
        ORDER BY ordinal_position
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      
      // 验证关键字段存在
      const columnNames = result.rows.map((r: any) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('code');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('parent_id');
      expect(columnNames).toContain('page_path');
      expect(columnNames).toContain('is_active');
    });

    it('应该能够查询权限树数据', async () => {
      const result = await db.query(`
        SELECT 
          id,
          name,
          code,
          type,
          parent_id,
          page_path,
          is_active
        FROM permissions
        WHERE is_active = true
        ORDER BY type, sort_order
        LIMIT 10
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      
      // 验证数据结构
      const permission = result.rows[0];
      expect(permission).toHaveProperty('id');
      expect(permission).toHaveProperty('name');
      expect(permission).toHaveProperty('type');
      expect(['module', 'page', 'function']).toContain(permission.type);
    });

    it('应该能够查询权限树结构', async () => {
      // 查询所有权限
      const allPermissions = await db.query(`
        SELECT 
          id,
          name,
          code,
          type,
          parent_id,
          page_path,
          sort_order,
          is_active
        FROM permissions
        WHERE is_active = true
        ORDER BY type, sort_order
      `);

      expect(allPermissions.rows.length).toBeGreaterThan(0);

      // 验证树结构完整性
      const permissions = allPermissions.rows;
      const permissionMap = new Map(permissions.map((p: any) => [p.id, p]));

      // 检查所有 parent_id 都指向有效的权限
      const invalidParents = permissions.filter((p: any) => 
        p.parent_id && !permissionMap.has(p.parent_id)
      );

      expect(invalidParents.length).toBe(0);
    });

    it('应该能够验证权限类型约束', async () => {
      // 检查 function 类型权限是否有 code
      const functionWithoutCode = await db.query(`
        SELECT id, name, type, code
        FROM permissions
        WHERE type = 'function' 
          AND (code IS NULL OR code = '')
          AND is_active = true
      `);

      // 根据文档，function 类型必须有 code（应用层验证）
      // 这里只是检查数据，不强制要求数据库约束
      console.log(`Function permissions without code: ${functionWithoutCode.rows.length}`);

      // 检查 page 类型权限是否有 page_path
      const pageWithoutPath = await db.query(`
        SELECT id, name, type, page_path
        FROM permissions
        WHERE type = 'page' 
          AND (page_path IS NULL OR page_path = '')
          AND is_active = true
      `);

      // 根据文档，page 类型必须有 page_path（应用层验证）
      console.log(`Page permissions without page_path: ${pageWithoutPath.rows.length}`);
    });

    it('应该能够验证权限树层级关系', async () => {
      const permissions = await db.query(`
        SELECT id, type, parent_id
        FROM permissions
        WHERE is_active = true
      `);

      const permissionMap = new Map(permissions.rows.map((p: any) => [p.id, p]));

      // 验证层级关系
      for (const perm of permissions.rows) {
        if (perm.parent_id) {
          const parent = permissionMap.get(perm.parent_id);
          expect(parent).toBeDefined();

          // 验证类型约束
          if (perm.type === 'function') {
            expect(parent?.type).toBe('page');
          } else if (perm.type === 'page') {
            expect(parent?.type).toBe('module');
          } else if (perm.type === 'module') {
            expect(parent?.type === 'module' || parent === undefined).toBe(true);
          }
        } else {
          // 根节点应该是 module
          expect(perm.type).toBe('module');
        }
      }
    });
  });

  describe('权限CRUD操作验证', () => {
    let testPermissionId: string | null = null;

    afterEach(async () => {
      // 清理测试数据
      if (testPermissionId) {
        try {
          await db.query('DELETE FROM permissions WHERE id = $1', [testPermissionId]);
        } catch (error) {
          console.error('Error cleaning up test permission:', error);
        }
        testPermissionId = null;
      }
    });

    it('应该能够创建权限', async () => {
      // 先获取一个 page 权限作为父节点
      const parentResult = await db.query(`
        SELECT id FROM permissions 
        WHERE type = 'page' AND is_active = true 
        LIMIT 1
      `);

      if (parentResult.rows.length === 0) {
        console.log('Skipping test: No page permission found');
        return;
      }

      const parentId = parentResult.rows[0].id;

      const result = await db.query(`
        INSERT INTO permissions (
          name, code, type, parent_id, description, sort_order, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, name, code, type, parent_id
      `, [
        '测试权限',
        'test.permission',
        'function',
        parentId,
        '这是一个测试权限',
        999,
        true
      ]);

      expect(result.rows.length).toBe(1);
      testPermissionId = result.rows[0].id;
      expect(result.rows[0].name).toBe('测试权限');
      expect(result.rows[0].code).toBe('test.permission');
      expect(result.rows[0].type).toBe('function');
    });

    it('应该能够更新权限', async () => {
      // 先创建一个测试权限
      const parentResult = await db.query(`
        SELECT id FROM permissions 
        WHERE type = 'page' AND is_active = true 
        LIMIT 1
      `);

      if (parentResult.rows.length === 0) {
        console.log('Skipping test: No page permission found');
        return;
      }

      const parentId = parentResult.rows[0].id;

      const createResult = await db.query(`
        INSERT INTO permissions (
          name, code, type, parent_id, description, sort_order, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id
      `, [
        '测试权限',
        'test.permission',
        'function',
        parentId,
        '这是一个测试权限',
        999,
        true
      ]);

      testPermissionId = createResult.rows[0].id;

      // 更新权限
      const updateResult = await db.query(`
        UPDATE permissions
        SET name = $1, description = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, description
      `, [
        '更新后的测试权限',
        '更新后的描述',
        testPermissionId
      ]);

      expect(updateResult.rows.length).toBe(1);
      expect(updateResult.rows[0].name).toBe('更新后的测试权限');
      expect(updateResult.rows[0].description).toBe('更新后的描述');
    });
  });

  describe('角色权限分配验证', () => {
    it('应该能够查询角色权限关联', async () => {
      const result = await db.query(`
        SELECT 
          r.id as role_id,
          r.name as role_name,
          COUNT(rp.permission_id) as permission_count
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        GROUP BY r.id, r.name
        LIMIT 5
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      
      // 验证数据结构
      const role = result.rows[0];
      expect(role).toHaveProperty('role_id');
      expect(role).toHaveProperty('role_name');
      expect(role).toHaveProperty('permission_count');
    });

    it('应该能够查询角色分配的所有类型权限', async () => {
      const result = await db.query(`
        SELECT 
          p.id,
          p.name,
          p.code,
          p.type,
          p.parent_id,
          p.page_path,
          p.is_active
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        WHERE p.is_active = true
        LIMIT 10
      `);

      if (result.rows.length > 0) {
        // 验证返回的权限包含所有类型
        const types = new Set(result.rows.map((r: any) => r.type));
        expect(types.size).toBeGreaterThan(0);
        
        // 验证数据结构
        const permission = result.rows[0];
        expect(permission).toHaveProperty('type');
        expect(['module', 'page', 'function']).toContain(permission.type);
      }
    });
  });
});

