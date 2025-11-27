import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db/client';

export interface ApiKeyAuth {
  userId: string;
  keyId: string;
  isSuperuser: boolean;
  userRoles: string[];
}

export async function validateApiKeyMiddleware(request: NextRequest): Promise<ApiKeyAuth | null> {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return null;
  }

  try {
    if (!apiKey.startsWith('rk_')) {
      return null;
    }

    const keyResult = await db.query(`
      SELECT id, user_id, is_active
      FROM api_keys
      WHERE api_key = $1
    `, [apiKey]);

    if (keyResult.rows.length === 0) {
      return null;
    }

    const keyRecord = keyResult.rows[0];

    if (!keyRecord.is_active) {
      return null;
    }

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
