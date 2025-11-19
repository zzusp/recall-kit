import { sql } from '../lib/db/config';
import crypto from 'crypto';

export interface ApiKeyInfo {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  expires_at: Date | null;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  apiKeyInfo?: ApiKeyInfo;
  error?: string;
}

/**
 * 验证API密钥并返回用户信息
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      isValid: false,
      error: 'API key is required and must be a string'
    };
  }

  try {
    // 从数据库查询API密钥
    const result = await sql`
      SELECT id, user_id, name, is_active
      FROM api_keys 
      WHERE api_key = ${apiKey}
      LIMIT 1
    `;

    if (result.length === 0) {
      return {
        isValid: false,
        error: 'Invalid API key'
      };
    }

    const apiKeyInfo = result[0] as ApiKeyInfo;

    // 检查API密钥是否激活
    if (!apiKeyInfo.is_active) {
      return {
        isValid: false,
        error: 'API key is deactivated'
      };
    }

    // 检查用户是否存在且激活
    const userResult = await sql`
      SELECT id, is_active 
      FROM users 
      WHERE id = ${apiKeyInfo.user_id}
      LIMIT 1
    `;

    if (userResult.length === 0) {
      return {
        isValid: false,
        error: 'User not found for this API key'
      };
    }

    const user = userResult[0];
    if (!user.is_active) {
      return {
        isValid: false,
        error: 'User account is deactivated'
      };
    }

    // 更新API密钥的最后使用时间
    await sql`
      UPDATE api_keys 
      SET last_used_at = NOW()
      WHERE id = ${apiKeyInfo.id}
    `;

    // 记录API密钥验证日志
    await logApiKeyValidation(apiKeyInfo.id, apiKeyInfo.user_id, apiKey.substring(0, 8), 'success');

    return {
      isValid: true,
      apiKeyInfo
    };

  } catch (error) {
    console.error('Error validating API key:', error);
    
    // 记录验证失败日志
    await logApiKeyValidation(
      null, 
      null, 
      apiKey ? apiKey.substring(0, 8) : 'unknown', 
      'failed'
    ).catch(logError => {
      console.error('Failed to log API key validation error:', logError);
    });

    return {
      isValid: false,
      error: 'Error validating API key'
    };
  }
}

/**
 * 记录API密钥验证日志
 */
async function logApiKeyValidation(
  apiKeyId: string | null,
  userId: string | null,
  apiKeyPrefix: string,
  validationResult: 'success' | 'failed'
): Promise<void> {
  try {
    await sql`
      INSERT INTO api_key_validation_logs (
        api_key_id, 
        user_id, 
        api_key_prefix, 
        validation_result, 
        created_at
      ) VALUES (
        ${apiKeyId}, 
        ${userId}, 
        ${apiKeyPrefix}, 
        ${validationResult}, 
        NOW()
      )
    `;
  } catch (error) {
    console.error('Failed to log API key validation:', error);
    throw error;
  }
}

/**
 * 生成API密钥
 */
export function generateApiKey(): { key: string; prefix: string } {
  const key = `rk_${crypto.randomBytes(16).toString('hex')}`;
  const prefix = key.substring(0, 10);
  
  return { key, prefix };
}