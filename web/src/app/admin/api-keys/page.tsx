'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSessionToken } from '@/lib/services/authClientService';
import { toast } from '@/lib/services/internal/toastService';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  apiKey: string; // Now included in the list response
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NewApiKey extends ApiKey {
  apiKey: string; // Only available during creation
}

export default function ApiKeysManagement() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [newApiKey, setNewApiKey] = useState<NewApiKey | null>(null);
  const [loadingCopy, setLoadingCopy] = useState<string | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/api-keys', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const data = await response.json();
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleDeleteApiKey = async (apiKeyId: string) => {
    const confirmed = await confirm({
      title: '删除API密钥',
      message: '确定要删除这个API密钥吗？此操作不可撤销。',
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (!confirmed) return;

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const response = await fetch(`/api/api-keys/${apiKeyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        fetchApiKeys();
      } else {
        toast.error('删除API密钥失败');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('删除API密钥失败');
    }
  };

  const handleToggleApiKey = async (apiKey: ApiKey) => {
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const response = await fetch(`/api/api-keys/${apiKey.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !apiKey.isActive })
      });

      if (response.ok) {
        fetchApiKeys();
      } else {
        toast.error('更新API密钥状态失败');
      }
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast.error('更新API密钥状态失败');
    }
  };

// 创建一个通用的复制函数，支持多种复制方法
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 后备方案：使用 document.execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
};

  const handleCopyFullApiKey = async (apiKey: ApiKey) => {
    try {
      setLoadingCopy(apiKey.id);
      const success = await copyToClipboard(apiKey.apiKey);
      if (success) {
        toast.success('API密钥已复制到剪贴板');
      } else {
        toast.error('复制API密钥失败，请手动复制');
      }
    } catch (error) {
      console.error('Error copying API key:', error);
      toast.error('复制API密钥失败');
    } finally {
      setLoadingCopy(null);
    }
  };


  const filteredApiKeys = apiKeys.filter(apiKey =>
    apiKey.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '从未';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '从未';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusBadge = (apiKey: ApiKey) => {
    if (!apiKey.isActive) {
      return <span className="admin-badge admin-badge-danger">已禁用</span>;
    }
    return <span className="admin-badge admin-badge-success">活跃</span>;
  };

  return (
    <div className="admin-content">
      <ConfirmDialogComponent />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">API密钥管理</h1>
          <p className="admin-page-subtitle">管理用户的API密钥，用于程序化访问系统</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn admin-btn-primary"
        >
          <i className="fas fa-plus"></i>
          创建API密钥
        </button>
      </div>

      <div className="admin-card">
        <div className="mb-6">
          <div className="relative max-w-md">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10"></i>
              <input
                type="text"
                placeholder="搜索API密钥名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ paddingLeft: '2.5rem' }}
              />
          </div>
        </div>

        {loading ? (
          <div className="admin-empty-state">
            <div className="admin-loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <div className="admin-empty-state-title">加载API密钥数据中...</div>
            <div className="admin-empty-state-description">请稍候片刻</div>
          </div>
        ) : filteredApiKeys.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <i className="fas fa-key"></i>
            </div>
            <div className="admin-empty-state-title">暂无API密钥</div>
            <div className="admin-empty-state-description">
              {search ? '没有找到匹配的API密钥' : '点击"创建API密钥"创建第一个密钥'}
            </div>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="admin-btn admin-btn-primary mt-4"
              >
                <i className="fas fa-plus"></i>
                创建API密钥
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>密钥</th>
                    <th>状态</th>
                    <th>最后使用</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApiKeys.map((apiKey) => (
                    <tr key={apiKey.id}>
                      <td>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            <i className="fas fa-key text-sm"></i>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{apiKey.name}</div>
                            <div className="flex items-center space-x-2">
                              <code className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                {apiKey.keyPrefix}...
                              </code>
                              <button
                                onClick={() => handleCopyFullApiKey(apiKey)}
                                disabled={loadingCopy === apiKey.id}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="复制完整密钥"
                              >
                                <i className={`fas ${loadingCopy === apiKey.id ? 'fa-spinner fa-spin' : 'fa-copy'} text-xs`}></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(apiKey)}
                      </td>
                      <td>
                        <div className="text-sm text-gray-600">
                          {apiKey.lastUsedAt ? (
                            <>
                              <div>{formatDate(apiKey.lastUsedAt)}</div>
                              <div className="text-gray-400 text-xs">
                                {new Date(apiKey.lastUsedAt).toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">从未使用</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-gray-600">
                          <div>{formatDate(apiKey.createdAt)}</div>
                          <div className="text-gray-400 text-xs">
                            {new Date(apiKey.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            onClick={() => handleToggleApiKey(apiKey)}
                            className={`admin-btn admin-btn-outline admin-btn-sm ${
                              apiKey.isActive 
                                ? 'admin-btn-warning-outline' 
                                : 'admin-btn-success-outline'
                            }`}
                            title={apiKey.isActive ? "禁用" : "启用"}
                          >
                            <i className={`fas ${apiKey.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                            {apiKey.isActive ? '禁用' : '启用'}
                          </button>
                          <button
                            onClick={() => setEditingApiKey(apiKey)}
                            className="admin-btn admin-btn-outline admin-btn-primary-outline admin-btn-sm"
                            title="编辑"
                          >
                            <i className="fas fa-edit"></i>
                            编辑
                          </button>
                          <Link
                            href={`/admin/api-keys/${apiKey.id}`}
                            className="admin-btn admin-btn-outline admin-btn-info admin-btn-sm"
                            title="查看详情"
                          >
                            <i className="fas fa-eye"></i>
                            详情
                          </Link>
                          <button
                            onClick={() => handleDeleteApiKey(apiKey.id)}
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            title="删除"
                          >
                            <i className="fas fa-trash"></i>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 创建API密钥模态框 */}
      {showCreateModal && (
        <ApiKeyModal
          apiKey={null}
          onClose={() => setShowCreateModal(false)}
          onSave={(apiKey) => {
            setNewApiKey(apiKey);
            setShowCreateModal(false);
            fetchApiKeys();
          }}
        />
      )}

      {/* 编辑API密钥模态框 */}
      {editingApiKey && (
        <ApiKeyModal
          apiKey={editingApiKey}
          onClose={() => setEditingApiKey(null)}
          onSave={() => {
            setEditingApiKey(null);
            fetchApiKeys();
          }}
        />
      )}

      {/* 新建API密钥显示模态框 */}
      {newApiKey && (
        <NewApiKeyModal
          apiKey={newApiKey}
          onClose={() => setNewApiKey(null)}
        />
      )}

    </div>
  );
}

// API密钥创建/编辑模态框组件
interface ApiKeyModalProps {
  apiKey: ApiKey | null;
  onClose: () => void;
  onSave: (apiKey: NewApiKey | null) => void;
}

function ApiKeyModal({ apiKey, onClose, onSave }: ApiKeyModalProps) {
  const [formData, setFormData] = useState({
    name: apiKey?.name || '',
    isActive: apiKey?.isActive ?? true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) return;

      const url = apiKey ? `/api/api-keys/${apiKey.id}` : '/api/api-keys';
      const method = apiKey ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onSave(data);
      } else {
        const error = await response.json();
        toast.error(error.message || '保存失败');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <i className={`fas ${apiKey ? 'fa-edit' : 'fa-plus'} text-white`}></i>
              </div>
              {apiKey ? '编辑API密钥' : '创建API密钥'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label className="admin-form-label flex items-center gap-2">
                <i className="fas fa-tag text-gray-400"></i>
                密钥名称 *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="admin-form-input"
                placeholder="请输入API密钥名称"
                maxLength={100}
              />
            </div>


            {!apiKey && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">创建说明</div>
                    <div>• API密钥将以 <code className="bg-blue-100 px-1 rounded">rk_</code> 开头</div>
                    <div>• 完整密钥仅在创建时显示一次，请妥善保存</div>
                    <div>• 建议为不同用途创建不同的API密钥</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">激活密钥</div>
                    <div className="text-sm text-gray-500">允许使用此API密钥访问系统</div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="admin-btn admin-btn-outline"
              >
                <i className="fas fa-times mr-2"></i>
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="admin-btn admin-btn-primary"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    {apiKey ? '更新中...' : '创建中...'}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    {apiKey ? '更新' : '创建'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// 新建API密钥显示模态框
interface NewApiKeyModalProps {
  apiKey: NewApiKey;
  onClose: () => void;
}

function NewApiKeyModal({ apiKey, onClose }: NewApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  // 在组件内部定义复制函数，确保作用域正确
  const handleCopyApiKey = async () => {
    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(apiKey.apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // 后备方案：使用 document.execCommand
        const textArea = document.createElement('textarea');
        textArea.value = apiKey.apiKey;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          toast.error('复制失败，请手动复制');
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                <i className="fas fa-check text-white"></i>
              </div>
              API密钥创建成功
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <i className="fas fa-exclamation-triangle text-yellow-600 mt-0.5"></i>
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">重要提醒</div>
                <div>请立即复制并保存此API密钥，这是您唯一一次看到完整密钥的机会。</div>
              </div>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label flex items-center gap-2">
              <i className="fas fa-key text-gray-400"></i>
              API密钥
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKey.apiKey}
                readOnly
                className="admin-form-input font-mono text-sm flex-1"
              />
              <button
                onClick={handleCopyApiKey}
                className={`admin-btn ${copied ? 'admin-btn-success' : 'admin-btn-outline'}`}
              >
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label flex items-center gap-2">
              <i className="fas fa-info-circle text-gray-400"></i>
              密钥信息
            </label>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">名称:</span>
                <span className="font-medium">{apiKey.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">前缀:</span>
                <code className="bg-gray-200 px-2 py-1 rounded text-sm">{apiKey.keyPrefix}...</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">创建时间:</span>
                <span className="font-medium">{new Date(apiKey.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="admin-btn admin-btn-primary"
            >
              <i className="fas fa-check mr-2"></i>
              我已保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}