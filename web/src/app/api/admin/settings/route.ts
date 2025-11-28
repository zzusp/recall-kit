import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { settingsService } from '@/lib/server/services/settings';

export const runtime = 'nodejs';

function hasSettingsPermission(
  user: { is_superuser?: boolean; permissions?: Array<{ resource: string; action: string }> } | undefined,
  action: 'read' | 'write'
) {
  if (user?.is_superuser) {
    return true;
  }

  return Boolean(
    user?.permissions?.some(
      permission => permission.resource === 'settings' && permission.action === action
    )
  );
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    if (!hasSettingsPermission(currentUser, 'read')) {
      return NextResponse.json(
        { error: '权限不足' },
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
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const currentUser = session.user as any;

    if (!hasSettingsPermission(currentUser, 'write')) {
      return NextResponse.json(
        { error: '权限不足' },
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
