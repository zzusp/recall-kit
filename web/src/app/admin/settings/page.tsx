'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/services/authClientService';

type AIServiceType = 'openai' | 'anthropic' | 'custom';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [aiServiceType, setAiServiceType] = useState<AIServiceType>('openai');
  const [aiConfig, setAiConfig] = useState({
    // OpenAI 配置
    openaiKey: '',
    openaiApiUrl: 'https://api.openai.com/v1',
    openaiModel: 'text-embedding-3-small',
    // Anthropic 配置
    anthropicKey: '',
    anthropicApiUrl: 'https://api.anthropic.com/v1',
    anthropicModel: 'claude-3-sonnet-20240229',
    // 自定义配置
    customApiUrl: '',
    customModel: '',
    customApiKey: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // 验证管理员权限
    const verifyAdmin = async () => {
      try {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
          router.push('/admin/login');
          return false;
        }
        
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
        
        if (!response.ok) {
          router.push('/admin/login');
          return false;
        }
        
        const user = await response.json();
        if (!user.is_superuser) {
          router.push('/admin/dashboard');
          return false;
        }
        
        return true;
      } catch (error) {
        router.push('/admin/login');
        return false;
      }
    };

    verifyAdmin();

    // 加载设置
    const loadSettings = async () => {
      try {
        // 获取 session token
        const sessionToken = getSessionToken();
        if (!sessionToken) {
          console.error('No session token found');
          return;
        }

        const response = await fetch('/api/admin/settings', {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data === 'object') {
            // 先设置 aiServiceType
            if (data.aiServiceType) {
              setAiServiceType(data.aiServiceType);
            }
            // 然后设置 aiConfig，排除 aiServiceType
            const { aiServiceType: _, ...config } = data;
            setAiConfig(prevConfig => ({
              ...prevConfig,
              ...config
            }));
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to load settings:', response.status, errorData);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    loadSettings();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // 获取 session token
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        throw new Error('未登录，请先登录');
      }

      // 根据选择的AI服务类型，只保存相关的配置
      let settings: any = {
        aiServiceType,
      };

      // 只保存当前选择的服务类型的配置
      if (aiServiceType === 'openai') {
        if (aiConfig.openaiKey) settings.openaiKey = aiConfig.openaiKey;
        if (aiConfig.openaiApiUrl && aiConfig.openaiApiUrl !== 'https://api.openai.com/v1') {
          settings.openaiApiUrl = aiConfig.openaiApiUrl;
        }
        if (aiConfig.openaiModel && aiConfig.openaiModel !== 'text-embedding-3-small') {
          settings.openaiModel = aiConfig.openaiModel;
        }
      } else if (aiServiceType === 'anthropic') {
        if (aiConfig.anthropicKey) settings.anthropicKey = aiConfig.anthropicKey;
        if (aiConfig.anthropicApiUrl && aiConfig.anthropicApiUrl !== 'https://api.anthropic.com/v1') {
          settings.anthropicApiUrl = aiConfig.anthropicApiUrl;
        }
        if (aiConfig.anthropicModel && aiConfig.anthropicModel !== 'claude-3-sonnet-20240229') {
          settings.anthropicModel = aiConfig.anthropicModel;
        }
      } else if (aiServiceType === 'custom') {
        if (aiConfig.customApiKey) settings.customApiKey = aiConfig.customApiKey;
        if (aiConfig.customApiUrl) settings.customApiUrl = aiConfig.customApiUrl;
        if (aiConfig.customModel) settings.customModel = aiConfig.customModel;
      }

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存设置失败');
      }

      setSuccess('设置已成功保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">系统设置</h1>
          <p className="admin-page-subtitle">配置系统参数和AI服务集成</p>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ background: '#fee2e2', borderColor: '#fecaca' }}>
          <div style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="admin-card" style={{ background: '#d1fae5', borderColor: '#a7f3d0' }}>
          <div style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">AI 服务配置</h2>
          <div style={{
            padding: '0.5rem 1rem',
            background: '#e0e7ff',
            color: '#4338ca',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <i className="fas fa-robot" style={{ marginRight: '0.5rem' }}></i>
            AI 集成
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* 服务类型选择 */}
          <div className="admin-form-group">
            <label className="admin-form-label">
              <i className="fas fa-layer-group" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
              AI 服务类型
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              marginTop: '0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setAiServiceType('openai')}
                style={{
                  padding: '1rem',
                  border: `2px solid ${aiServiceType === 'openai' ? '#4361ee' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  background: aiServiceType === 'openai' ? '#eef2ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (aiServiceType !== 'openai') {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (aiServiceType !== 'openai') {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <i className="fas fa-brain" style={{ fontSize: '1.5rem', color: '#4361ee' }}></i>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>OpenAI</span>
              </button>

              <button
                type="button"
                onClick={() => setAiServiceType('anthropic')}
                style={{
                  padding: '1rem',
                  border: `2px solid ${aiServiceType === 'anthropic' ? '#764ba2' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  background: aiServiceType === 'anthropic' ? '#f5f3ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (aiServiceType !== 'anthropic') {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (aiServiceType !== 'anthropic') {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <i className="fas fa-robot" style={{ fontSize: '1.5rem', color: '#764ba2' }}></i>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>Anthropic</span>
              </button>

              <button
                type="button"
                onClick={() => setAiServiceType('custom')}
                style={{
                  padding: '1rem',
                  border: `2px solid ${aiServiceType === 'custom' ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  background: aiServiceType === 'custom' ? '#ecfdf5' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (aiServiceType !== 'custom') {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (aiServiceType !== 'custom') {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <i className="fas fa-cog" style={{ fontSize: '1.5rem', color: '#10b981' }}></i>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>自定义</span>
              </button>
            </div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
              选择要使用的AI服务类型
            </p>
          </div>

          {/* OpenAI 配置 */}
          {aiServiceType === 'openai' && (
            <div style={{
              padding: '1.5rem',
              background: '#f8fafc',
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <i className="fas fa-brain" style={{ color: '#4361ee', fontSize: '1.25rem' }}></i>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  margin: 0
                }}>
                  OpenAI 配置
                </h3>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-key" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  className="admin-form-input"
                  value={aiConfig.openaiKey}
                  onChange={(e) => setAiConfig({...aiConfig, openaiKey: e.target.value})}
                  placeholder="sk-..."
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  用于生成嵌入向量和AI相关功能
                </p>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-link" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  OpenAI API 地址
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={aiConfig.openaiApiUrl}
                  onChange={(e) => setAiConfig({...aiConfig, openaiApiUrl: e.target.value})}
                  placeholder="https://api.openai.com/v1"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  支持自定义 API 地址，可用于代理或自部署服务
                </p>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-microchip" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  OpenAI 模型名称
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={aiConfig.openaiModel}
                  onChange={(e) => setAiConfig({...aiConfig, openaiModel: e.target.value})}
                  placeholder="text-embedding-3-small"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  例如：text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
                </p>
              </div>
            </div>
          )}

          {/* Anthropic 配置 */}
          {aiServiceType === 'anthropic' && (
            <div style={{
              padding: '1.5rem',
              background: '#f8fafc',
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <i className="fas fa-robot" style={{ color: '#764ba2', fontSize: '1.25rem' }}></i>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  margin: 0
                }}>
                  Anthropic 配置
                </h3>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-key" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  className="admin-form-input"
                  value={aiConfig.anthropicKey}
                  onChange={(e) => setAiConfig({...aiConfig, anthropicKey: e.target.value})}
                  placeholder="sk-ant-..."
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  用于Claude AI模型集成
                </p>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-link" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  Anthropic API 地址
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={aiConfig.anthropicApiUrl}
                  onChange={(e) => setAiConfig({...aiConfig, anthropicApiUrl: e.target.value})}
                  placeholder="https://api.anthropic.com/v1"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  支持自定义 API 地址，可用于代理或自部署服务
                </p>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-microchip" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  Anthropic 模型名称
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={aiConfig.anthropicModel}
                  onChange={(e) => setAiConfig({...aiConfig, anthropicModel: e.target.value})}
                  placeholder="claude-3-sonnet-20240229"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  例如：claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
                </p>
              </div>
            </div>
          )}

          {/* 自定义配置 */}
          {aiServiceType === 'custom' && (
            <div style={{
              padding: '1.5rem',
              background: '#f8fafc',
              borderRadius: '8px',
              marginTop: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <i className="fas fa-cog" style={{ color: '#10b981', fontSize: '1.25rem' }}></i>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  margin: 0
                }}>
                  自定义服务配置
                </h3>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-key" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  API Key
                </label>
                <input
                  type="password"
                  className="admin-form-input"
                  value={aiConfig.customApiKey}
                  onChange={(e) => setAiConfig({...aiConfig, customApiKey: e.target.value})}
                  placeholder="输入您的 API Key"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  自定义服务的 API 密钥
                </p>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-link" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  API 地址
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={aiConfig.customApiUrl}
                  onChange={(e) => setAiConfig({...aiConfig, customApiUrl: e.target.value})}
                  placeholder="https://api.example.com/v1"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  自定义服务的 API 端点地址
                </p>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  <i className="fas fa-microchip" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                  模型名称
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={aiConfig.customModel}
                  onChange={(e) => setAiConfig({...aiConfig, customModel: e.target.value})}
                  placeholder="输入模型名称"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  自定义服务使用的模型名称
                </p>
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e2e8f0',
            marginTop: '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="admin-btn admin-btn-outline"
            >
              <i className="fas fa-times"></i>
              <span>取消</span>
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="admin-btn admin-btn-primary"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  <span>保存设置</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">系统信息</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
              系统版本
            </div>
            <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 500 }}>
              v1.0.0
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
              数据库
            </div>
            <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 500 }}>
              PostgreSQL
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
              运行环境
            </div>
            <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 500 }}>
              Production
            </div>
          </div>
        </div>
      </div>
    </>
  );
}