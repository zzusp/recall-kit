<![CDATA
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import crypto from 'crypto';

export interface ApiKeyAuth {
  userId: string;
  keyId: string;
  isSuperuser: boolean;
  userRoles: string[];
}

/**
 * 验证API密钥并返回用户信息
 */
export async function validateApiKeyMiddleware(request: NextRequest): Promise<ApiKeyAuth | null> {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return null;
  }

  try {
    // 验证API密钥格式
    if (!apiKey.startsWith('rk_')) {
      return null;
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 10);

    // 查询API密钥
    const keyResult = await db.query(`
      SELECT id, user_id, is_active
      FROM api_keys
      WHERE key_hash = $1 AND key_prefix = $2
    `, [keyHash, keyPrefix]);

    if (keyResult.rows.length === 0) {
      return null;
    }

    const keyRecord = keyResult.rows[0];

    // 检查密钥是否激活
    if (!keyRecord.is_active) {
      return null;
    }

    // 获取用户信息和角色
    const userResult = await db.query(`
      SELECT u.is_superuser, r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
    `, [keyRecord.user_id]);

    if (userResult.rows.length === 0) {
      return null;
    }

    const userRoles = userResult.rows.map(row => row.role_name).filter(Boolean);
    const isSuperuser = userResult.rows[0]?.is_superuser || false;

    // 更新最后使用时间
    await db.query(
      'UPDATE api_keys SET last_used_at = $1 WHERE id = $2',
      [new Date().toISOString(), keyRecord.id]
    );

    return {
      userId: keyRecord.user_id,
      keyId: keyRecord.id,
      isSuperuser,
      userRoles
    };

  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

/**
 * 记录API密钥使用日志
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  request: NextRequest,
  statusCode: number,
  responseTimeMs: number
): Promise<void> {
  try {
    const url = new URL(request.url);
    
    await db.query(`
      INSERT INTO api_key_usage_logs (api_key_id, endpoint, method, ip_address, user_agent, status_code, response_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      apiKeyId,
      url.pathname + url.search,
      request.method,
      request.ip || request.headers.get('x-forwarded-for') || null,
      request.headers.get('user-agent') || null,
      statusCode,
      responseTimeMs
    ]);
  } catch (error) {
    console.error('Failed to log API key usage:', error);
    // Don't throw error to avoid affecting the main request
  }
}