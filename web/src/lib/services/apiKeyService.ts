import { ApiKey, ApiKeyUsageLog } from '@/types/database';
import { db } from '../db/client';
import crypto from 'crypto';

export interface CreateApiKeyRequest {
  name: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  apiKey: string; // Only returned once during creation
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 生成安全的API密钥
 */
function generateApiKey(): { apiKey: string; keyPrefix: string } {
  // 使用16字节的随机数据，生成32个十六进制字符，总长度35字符（rk_ + 32）
  const apiKey = `rk_${crypto.randomBytes(16).toString('hex')}`;
  const keyPrefix = apiKey.substring(0, 10);
  
  return { apiKey, keyPrefix };
}

/**
 * 创建新的API密钥
 */
export async function createApiKey(
  userId: string,
  request: CreateApiKeyRequest
): Promise<ApiKeyResponse> {
  const { apiKey, keyPrefix } = generateApiKey();

  const result = await db.query(`
    INSERT INTO api_keys (user_id, name, api_key)
    VALUES ($1, $2, $3)
    RETURNING id, name, is_active, last_used_at, created_at, updated_at
  `, [
    userId,
    request.name,
    apiKey // Store the full API key temporarily for copy functionality
  ]);

  const apiKeyRecord = result.rows[0];

  return {
    id: apiKeyRecord.id,
    name: apiKeyRecord.name,
    keyPrefix, // Use generated prefix
    apiKey, // Only return the full key during creation
    isActive: apiKeyRecord.is_active,
    lastUsedAt: apiKeyRecord.last_used_at,
    createdAt: apiKeyRecord.created_at,
    updatedAt: apiKeyRecord.updated_at
  };
}

/**
 * 获取用户的所有API密钥（包含完整密钥）
 */
export async function getUserApiKeys(userId: string): Promise<ApiKeyResponse[]> {
  const result = await db.query(`
    SELECT id, name, api_key, is_active, last_used_at, created_at, updated_at
    FROM api_keys
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.api_key ? row.api_key.substring(0, 10) : '', // Keep prefix for display purposes
    apiKey: row.api_key, // Return the full API key
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * 根据ID获取API密钥信息（不包含完整密钥）
 */
export async function getApiKeyById(userId: string, apiKeyId: string): Promise<Omit<ApiKeyResponse, 'apiKey'> | null> {
  const result = await db.query(`
    SELECT id, name, api_key, is_active, last_used_at, created_at, updated_at
    FROM api_keys
    WHERE id = $1 AND user_id = $2
  `, [apiKeyId, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.api_key ? row.api_key.substring(0, 10) : '', // Get prefix from full key
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 验证API密钥并返回用户信息
 */
export async function validateApiKey(apiKey: string): Promise<{ userId: string; keyId: string } | null> {
  // Since we're storing full API key now, we can query directly
  const result = await db.query(`
    SELECT id, user_id, is_active
    FROM api_keys
    WHERE api_key = $1
  `, [apiKey]);

  if (result.rows.length === 0) {
    return null;
  }

  const keyRecord = result.rows[0];

  // Check if key is active
  if (!keyRecord.is_active) {
    return null;
  }

  // Update last used timestamp
  await db.query(
    'UPDATE api_keys SET last_used_at = $1 WHERE id = $2',
    [new Date().toISOString(), keyRecord.id]
  );

  return {
    userId: keyRecord.user_id,
    keyId: keyRecord.id
  };
}

/**
 * 更新API密钥信息
 */
export async function updateApiKey(
  userId: string,
  apiKeyId: string,
  updates: {
    name?: string;
    isActive?: boolean;
  }
): Promise<Omit<ApiKeyResponse, 'apiKey'> | null> {
  const setFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setFields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.isActive !== undefined) {
    setFields.push(`is_active = $${paramIndex++}`);
    values.push(updates.isActive);
  }

  if (setFields.length === 0) {
    return getApiKeyById(userId, apiKeyId);
  }

  // Add updated_at timestamp
  setFields.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());

  values.push(apiKeyId, userId);

  const result = await db.query(`
    UPDATE api_keys
    SET ${setFields.join(', ')}
    WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
    RETURNING id, name, api_key, is_active, last_used_at, created_at, updated_at
  `, values);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.api_key ? row.api_key.substring(0, 10) : '', // Get prefix from full key
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 删除API密钥
 */
export async function deleteApiKey(userId: string, apiKeyId: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM api_keys WHERE id = $1 AND user_id = $2',
    [apiKeyId, userId]
  );

  return result.rowCount > 0;
}


/**
 * 记录API密钥使用日志
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await db.query(`
    INSERT INTO api_key_usage_logs (api_key_id, endpoint, method, ip_address, user_agent, status_code, response_time_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    apiKeyId,
    endpoint,
    method,
    ipAddress || null,
    userAgent || null,
    statusCode,
    responseTimeMs
  ]);
}

/**
 * 获取API密钥使用日志
 */
export async function getApiKeyUsageLogs(
  userId: string,
  apiKeyId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ApiKeyUsageLog[]> {
  const result = await db.query(`
    SELECT id, api_key_id, endpoint, method, ip_address, user_agent, status_code, response_time_ms, created_at
    FROM api_key_usage_logs
    WHERE api_key_id = $1 AND EXISTS (
      SELECT 1 FROM api_keys 
      WHERE api_keys.id = $1 AND api_keys.user_id = $2
    )
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
  `, [apiKeyId, userId, limit, offset]);

  return result.rows;
}

/**
 * 获取API密钥使用统计
 */
export async function getApiKeyUsageStats(userId: string, apiKeyId: string): Promise<{
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  lastUsedAt: string | null;
}> {
  const result = await db.query(`
    SELECT 
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status_code < 400 THEN 1 END) as success_requests,
      COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests,
      AVG(response_time_ms) as average_response_time,
      MAX(created_at) as last_used_at
    FROM api_key_usage_logs
    WHERE api_key_id = $1 AND EXISTS (
      SELECT 1 FROM api_keys 
      WHERE api_keys.id = $1 AND api_keys.user_id = $2
    )
  `, [apiKeyId, userId]);

  const row = result.rows[0];
  return {
    totalRequests: parseInt(row.total_requests),
    successRequests: parseInt(row.success_requests),
    errorRequests: parseInt(row.error_requests),
    averageResponseTime: parseFloat(row.average_response_time) || 0,
    lastUsedAt: row.last_used_at
  };
}

/**
 * 获取完整的API密钥用于复制
 */
export async function getFullApiKey(userId: string, apiKeyId: string): Promise<ApiKeyResponse | null> {
  const result = await db.query(`
    SELECT id, name, api_key, is_active, last_used_at, created_at, updated_at
    FROM api_keys
    WHERE id = $1 AND user_id = $2
  `, [apiKeyId, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.api_key ? row.api_key.substring(0, 10) : '',
    apiKey: row.api_key, // Return the full key
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
