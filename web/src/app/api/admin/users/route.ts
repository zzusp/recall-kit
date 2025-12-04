import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

/**
 * 创建用户 API
 */
export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;

    // 检查权限
    if (!currentUser.is_superuser && !hasPermission(session, 'users.create')) {
      return ApiRouteError.forbidden('您没有权限创建用户');
    }

    const { username, email, password, role_ids } = await request.json();

    // 验证必填字段
    if (!username || !email || !password) {
      return ApiRouteError.badRequest('用户名、邮箱和密码为必填项');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ApiRouteError.badRequest('邮箱格式不正确');
    }

    // 验证用户名唯一性
    const existingUserQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
    const existingUserResult = await db.query(existingUserQuery, [username, email]);

    if (existingUserResult.rows.length > 0) {
      return ApiRouteError.badRequest('用户名或邮箱已存在');
    }

    // 获取密码配置
    const { authConfig } = await import('@/config/auth');

    // 验证密码强度
    const errors: string[] = [];
    if (password.length < authConfig.password.minLength) {
      errors.push(`密码长度不能少于${authConfig.password.minLength}位`);
    }
    if (authConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母');
    }
    if (authConfig.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母');
    }
    if (authConfig.password.requireNumbers && !/\d/.test(password)) {
      errors.push('密码必须包含数字');
    }

    if (errors.length > 0) {
      return ApiRouteError.badRequest(errors.join(', '));
    }

    // 开始事务
    await db.query('BEGIN');

    try {
      // 创建用户
      const createUserQuery = `
        INSERT INTO users (username, email, password_hash, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, true, NOW(), NOW())
        RETURNING id, username, email, is_active, created_at, updated_at
      `;

      const passwordHash = await bcrypt.hash(
        password,
        authConfig.password?.saltRounds ?? 12
      );

      const userResult = await db.query(createUserQuery, [username, email, passwordHash]);

      const newUser = userResult.rows[0];

      // 分配角色（如果提供）
      if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
        // 验证角色是否存在
        const validRolesQuery = 'SELECT id FROM roles WHERE id = ANY($1)';
        const validRolesResult = await db.query(validRolesQuery, [role_ids]);

        if (validRolesResult.rows.length !== role_ids.length) {
          await db.query('ROLLBACK');
          return ApiRouteError.badRequest('部分角色不存在');
        }

        // 分配角色
        const assignRolesQuery = 'INSERT INTO user_roles (user_id, role_id, created_at) VALUES ($1, $2, NOW())';
        for (const roleId of role_ids) {
          await db.query(assignRolesQuery, [newUser.id, roleId]);
        }
      }

      // 提交事务
      await db.query('COMMIT');

      return ApiRouteResponse.created(newUser, '用户创建成功');

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return ApiRouteError.internal('创建用户失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

/**
 * 获取用户列表 API
 */
export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const currentUser = session.user as any;

    // 检查权限
    if (!currentUser.is_superuser && !hasPermission(session, 'users.view')) {
      return ApiRouteError.forbidden('您没有权限查看用户');
    }

    const queryParams = new URL(request.url).searchParams;
    const search = queryParams.get('search')?.trim();
    const page = Number(queryParams.get('page') ?? '1');
    const limit = Number(queryParams.get('limit') ?? '10');
    const roleId = queryParams.get('role_id')?.trim() || null;

    const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const pageSize = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
    const offset = (currentPage - 1) * pageSize;

    const filters: string[] = [];
    const filterValues: any[] = [];

    if (search) {
      filterValues.push(`%${search}%`);
      const paramIndex = filterValues.length;
      filters.push(`(u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    }

    if (roleId) {
      const isValidUUID = /^[0-9a-fA-F-]{36}$/.test(roleId);
      if (!isValidUUID) {
        return ApiRouteError.badRequest('角色ID格式不正确');
      }
      filterValues.push(roleId);
      const paramIndex = filterValues.length;
      filters.push(`ur.role_id = $${paramIndex}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const limitParamIndex = filterValues.length + 1;
    const offsetParamIndex = filterValues.length + 2;

    const query = `
      SELECT 
        u.id, u.username, u.email, u.is_active, u.is_superuser,
        u.created_at, u.updated_at, u.last_login_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'name', r.name,
              'is_system_role', r.is_system_role
            ) ORDER BY r.created_at
          ) FILTER (WHERE r.id IS NOT NULL), 
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id, u.username, u.email, u.is_active, u.is_superuser, 
               u.created_at, u.updated_at, u.last_login_at
      ORDER BY u.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const result = await db.query(query, [...filterValues, pageSize, offset]);

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, filterValues);
    const total = parseInt(countResult.rows[0].total);

    return ApiRouteResponse.success({
      users: result.rows,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return ApiRouteError.internal('获取用户列表失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
