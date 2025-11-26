import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/server/services/auth';
import { settingsService } from '@/lib/server/services/settings';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

    if (!hasPermission(user, 'settings', 'read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 使用服务端设置服务获取设置
    const settings = await settingsService.getAllSettings();

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
    
    // 支持两种模式：单个设置和批量设置
    if (body.setting_key !== undefined && body.setting_value !== undefined) {
      // 单个设置模式：更新数据
      const { setting_key, setting_value } = body;

      if (!setting_key) {
        return NextResponse.json(
          { error: 'Setting key is required' },
          { status: 400 }
        );
      }

      // 使用服务端设置服务更新单个设置
      await settingsService.setSetting(setting_key, setting_value);

      // 获取更新后的值
      const updatedValue = await settingsService.getSetting(setting_key);

      return NextResponse.json({
        setting_key,
        setting_value: updatedValue,
        updated_at: new Date().toISOString()
      });
    } else {
      // 批量设置模式
      const settings = body;
      
      if (typeof settings !== 'object' || settings === null) {
        return NextResponse.json(
          { error: 'Settings object is required' },
          { status: 400 }
        );
      }

      // 使用服务端设置服务批量更新
      await settingsService.setSettings(settings);

      // 获取更新后的设置用于返回
      const updatedSettings = await settingsService.getAllSettings();
      const results = Object.entries(updatedSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }));

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
