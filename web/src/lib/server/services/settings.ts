import { db } from '../db/client';

/**
 * 系统设置服务
 * 用于服务端代码直接访问系统设置，避免通过HTTP调用
 */
export class SettingsService {
  /**
   * 获取所有系统设置
   */
  async getAllSettings(): Promise<Record<string, any>> {
    const result = await db.query(
      'SELECT setting_key, setting_value, updated_at FROM system_settings ORDER BY setting_key'
    );

    return result.rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * 获取单个设置值
   */
  async getSetting(key: string): Promise<string | null> {
    const result = await db.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      [key]
    );

    return result.rows.length > 0 ? result.rows[0].setting_value : null;
  }

  /**
   * 获取AI配置（从系统设置中提取）
   */
  async getAIConfig(): Promise<{
    aiServiceType?: 'openai' | 'anthropic' | 'custom';
    openaiKey?: string;
    openaiApiUrl?: string;
    openaiModel?: string;
    anthropicKey?: string;
    anthropicApiUrl?: string;
    anthropicModel?: string;
    customApiKey?: string;
    customApiUrl?: string;
    customModel?: string;
  } | null> {
    const settings = await this.getAllSettings();
    
    // 如果没有任何AI相关设置，返回null
    if (!settings.aiServiceType) {
      return null;
    }

    return {
      aiServiceType: settings.aiServiceType as 'openai' | 'anthropic' | 'custom',
      openaiKey: settings.openaiKey,
      openaiApiUrl: settings.openaiApiUrl,
      openaiModel: settings.openaiModel,
      anthropicKey: settings.anthropicKey,
      anthropicApiUrl: settings.anthropicApiUrl,
      anthropicModel: settings.anthropicModel,
      customApiKey: settings.customApiKey,
      customApiUrl: settings.customApiUrl,
      customModel: settings.customModel,
    };
  }

  /**
   * 更新或创建设置
   */
  async setSetting(key: string, value: any): Promise<void> {
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = $2, updated_at = NOW()`,
      [key, typeof value === 'string' ? value : JSON.stringify(value)]
    );
  }

  /**
   * 批量更新设置
   */
  async setSettings(settings: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.setSetting(key, value);
    }
  }
}

// 导出单例实例
export const settingsService = new SettingsService();

