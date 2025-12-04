import { ApiKey } from '@/types/database/auth';
import { db } from '../db/client';
import crypto from 'crypto';

export interface CreateApiKeyRequest {
  name: string;
}

export interface ApiKeyResponse {
  id: string;
  userId: string;
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
    RETURNING id, user_id, name, is_active, last_used_at, created_at, updated_at
  `, [
    userId,
    request.name,
    apiKey // Store the full API key temporarily for copy functionality
  ]);

  const apiKeyRecord = result.rows[0];
  
  return {
    id: apiKeyRecord.id,
    userId: apiKeyRecord.user_id,
    name: apiKeyRecord.name,
    keyPrefix,
    apiKey, // Only returned once during creation
    isActive: apiKeyRecord.is_active,
    lastUsedAt: apiKeyRecord.last_used_at,
    createdAt: apiKeyRecord.created_at,
    updatedAt: apiKeyRecord.updated_at,
  };
}

/**
 * 获取用户的API密钥列表（隐藏完整密钥）
 */
export async function getUserApiKeys(userId: string): Promise<ApiKeyResponse[]> {
  const result = await db.query(`
    SELECT id, user_id, name, is_active, last_used_at, created_at, updated_at
    FROM api_keys
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: '',
    apiKey: '', // Hide full key in list
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 获取单个API密钥信息
 */
export async function getApiKeyById(id: string): Promise<ApiKeyResponse | null> {
  const result = await db.query(`
    SELECT id, user_id, name, is_active, last_used_at, created_at, updated_at
    FROM api_keys
    WHERE id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: '',
    apiKey: '', // Hide full key in normal get
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 获取完整的API密钥用于复制
 */
export async function getFullApiKey(userId: string, apiKeyId: string): Promise<ApiKeyResponse | null> {
  const result = await db.query(`
    SELECT id, user_id, name, api_key, is_active, last_used_at, created_at, updated_at
    FROM api_keys
    WHERE id = $1 AND user_id = $2
  `, [apiKeyId, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: row.api_key ? row.api_key.substring(0, 10) : '',
    apiKey: row.api_key, // Return full key
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 更新API密钥
 */
export async function updateApiKey(
  id: string,
  updates: { name?: string; isActive?: boolean },
  userId: string
): Promise<ApiKeyResponse | null> {
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.isActive !== undefined) {
    updateFields.push(`is_active = $${paramIndex++}`);
    values.push(updates.isActive);
  }

  if (updateFields.length === 0) {
    return await getApiKeyById(id);
  }

  updateFields.push(`updated_at = NOW()`);
  values.push(id); // WHERE condition

  const result = await db.query(`
    UPDATE api_keys
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
    RETURNING id, user_id, name, is_active, last_used_at, created_at, updated_at
  `, [...values, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: '',
    apiKey: '', // Hide full key in update response
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 删除API密钥（硬删除）
 */
export async function deleteApiKey(id: string, userId: string): Promise<boolean> {
  const result = await db.query(`
    DELETE FROM api_keys
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);

  return (result.rowCount || 0) > 0;
}

/**
 * 验证API密钥
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyResponse | null> {
  if (!apiKey || !apiKey.startsWith('rk_')) {
    return null;
  }

  const result = await db.query(`
    SELECT id, user_id, name, is_active, last_used_at, created_at, updated_at
    FROM api_keys
    WHERE api_key = $1 AND is_active = true
  `, [apiKey]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: apiKey.substring(0, 10),
    apiKey, // Return full key for validation
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 更新API密钥最后使用时间
 */
export async function updateLastUsed(apiKey: string): Promise<void> {
  await db.query(`
    UPDATE api_keys
    SET last_used_at = NOW()
    WHERE api_key = $1
  `, [apiKey]);
}
