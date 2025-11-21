import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, hasPermission } from '@/lib/services/internal/authService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Allow internal calls for embedding service
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    if (!isInternalCall) {
      // Get session token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization token required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      
      // Verify user and permissions
      const user = await getCurrentUser(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      if (!hasPermission(user, 'settings', 'read')) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Get settings
    const result = await db.query(
      'SELECT setting_key, setting_value, updated_at FROM system_settings ORDER BY setting_key'
    );

    const settings = result.rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify user and permissions
    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!hasPermission(user, 'settings', 'write')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // 支持单个设置项和批量设置项
    if (body.setting_key !== undefined && body.setting_value !== undefined) {
      // 单个设置项模式（向后兼容）
      const { setting_key, setting_value } = body;

      if (!setting_key) {
        return NextResponse.json(
          { error: 'Setting key is required' },
          { status: 400 }
        );
      }

      // Update or insert single setting
      const result = await db.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (setting_key) 
         DO UPDATE SET setting_value = $2, updated_at = NOW()
         RETURNING *`,
        [setting_key, setting_value]
      );

      return NextResponse.json({
        setting_key: result.rows[0].setting_key,
        setting_value: result.rows[0].setting_value,
        updated_at: result.rows[0].updated_at
      });
    } else {
      // 批量设置项模式
      const settings = body;
      
      if (typeof settings !== 'object' || settings === null) {
        return NextResponse.json(
          { error: 'Settings object is required' },
          { status: 400 }
        );
      }

      const results = [];
      
      for (const [key, value] of Object.entries(settings)) {
        try {
          const result = await db.query(
            `INSERT INTO system_settings (setting_key, setting_value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (setting_key) 
             DO UPDATE SET setting_value = $2, updated_at = NOW()
             RETURNING *`,
            [key, value]
          );
          results.push({
            setting_key: result.rows[0].setting_key,
            setting_value: result.rows[0].setting_value,
            updated_at: result.rows[0].updated_at
          });
        } catch (error) {
          console.error(`Failed to save setting ${key}:`, error);
          return NextResponse.json(
            { error: `Failed to save setting: ${key}` },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Settings saved successfully',
        settings: results
      });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}