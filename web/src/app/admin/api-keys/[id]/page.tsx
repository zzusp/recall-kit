'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/services/authClientService';
import { ApiKeyUsageLog } from '@/types/database';

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UsageStats {
  totalRequests: number;
  successRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  lastUsedAt: string | null;
}

export default function ApiKeyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageLogs, setUsageLogs] = useState<ApiKeyUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);

  // Use React.use() to unwrap the params Promise
  const { id: apiKeyId } = use(params);

  const fetchApiKey = async () => {
    try {
      setLoading(true);
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/api-keys/${apiKeyId}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API key');
      }

      const data = await response.json();
      setApiKey(data);
    } catch (error) {
      console.error('Error fetching API key:', error);
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const response = await fetch(`/api/api-keys/${apiKeyId}/logs/stats`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const fetchUsageLogs = async (page: number = 1) => {
    try {
      setLogsLoading(true);
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const response = await fetch(`/api/api-keys/${apiKeyId}/logs?page=${page}&limit=20`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsageLogs(data.logs || []);
        setTotalPages(data.pages || 1);
        setCurrentPage(data.page || 1);
      }
    } catch (error) {
      console.error('Error fetching usage logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKey();
    fetchUsageStats();
  }, [apiKeyId]);

  useEffect(() => {
    fetchUsageLogs(currentPage);
  }, [currentPage]);

  const handleDeleteApiKey = async () => {
    if (!confirm('确定要删除这个API密钥吗？此操作不可撤销。')) return;

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const response = await fetch(`/api/api-keys/${apiKeyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        router.push('/admin/api-keys');
      } else {
        alert('删除API密钥失败');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('删除API密钥失败');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '从未';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '从未';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusBadge = () => {
    if (!apiKey?.isActive) {
      return <span className="admin-badge admin-badge-danger">已禁用</span>;
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <span className="admin-badge admin-badge-warning">已过期</span>;
    }
    return <span className="admin-badge admin-badge-success">活跃</span>;
  };

  const getSuccessRate = () => {
    if (!usageStats || usageStats.totalRequests === 0) return 0;
    return ((usageStats.successRequests / usageStats.totalRequests) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="admin-content">
        <div className="admin-empty-state">
          <div className="admin-loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
          <div className="admin-empty-state-title">加载API密钥详情中...</div>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="admin-content">
        <div className="admin-empty-state">
          <div className="admin-empty-state-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="admin-empty-state-title">API密钥不存在</div>
          <button
            onClick={() => router.push('/admin/api-keys')}
            className="admin-btn admin-btn-primary mt-4"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            返回API密钥列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/api-keys')}
            className="admin-btn admin-btn-outline"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="admin-page-title">{apiKey.name}</h1>
            <p className="admin-page-subtitle">API密钥详情和使用统计</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="admin-btn admin-btn-outline"
          >
            <i className="fas fa-edit"></i>
            编辑
          </button>
          <button
            onClick={handleDeleteApiKey}
            className="admin-btn admin-btn-danger"
          >
            <i className="fas fa-trash"></i>
            删除
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="admin-card h-full">
            <h2 className="admin-card-title">基本信息</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">密钥前缀</span>
                <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">{apiKey.keyPrefix}...</code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">状态</span>
                {getStatusBadge()}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">创建时间</span>
                <span className="text-gray-900">{formatDateTime(apiKey.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">更新时间</span>
                <span className="text-gray-900">{formatDateTime(apiKey.updatedAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">最后使用</span>
                <span className="text-gray-900">{formatDateTime(apiKey.lastUsedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 使用统计 */}
        <div>
          <div className="admin-card h-full">
            <h2 className="admin-card-title">使用统计</h2>
            {usageStats ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{usageStats.totalRequests}</div>
                  <div className="text-sm text-blue-600">总请求次数</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">{usageStats.successRequests}</div>
                    <div className="text-xs text-green-600">成功请求</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-semibold text-red-600">{usageStats.errorRequests}</div>
                    <div className="text-xs text-red-600">失败请求</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">成功率</span>
                    <span className="font-medium">{getSuccessRate()}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">平均响应时间</span>
                    <span className="font-medium">{usageStats.averageResponseTime.toFixed(0)}ms</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getSuccessRate()}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-chart-bar text-3xl mb-2"></i>
                <div>暂无使用数据</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 使用日志 */}
      <div className="admin-card">
        <h2 className="admin-card-title">使用日志</h2>
        {logsLoading ? (
          <div className="admin-empty-state">
            <div className="admin-loading-spinner">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <div className="admin-empty-state-title">加载使用日志中...</div>
          </div>
        ) : usageLogs.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <i className="fas fa-history"></i>
            </div>
            <div className="admin-empty-state-title">暂无使用日志</div>
            <div className="admin-empty-state-description">此API密钥还没有被使用过</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>端点</th>
                    <th>方法</th>
                    <th>状态码</th>
                    <th>响应时间</th>
                    <th>IP地址</th>
                    <th>用户代理</th>
                  </tr>
                </thead>
                <tbody>
                  {usageLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="text-sm">
                          <div>{formatDate(log.createdAt)}</div>
                          <div className="text-gray-400 text-xs">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {log.endpoint}
                        </code>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge-sm ${
                          log.method === 'GET' ? 'admin-badge-success' :
                          log.method === 'POST' ? 'admin-badge-primary' :
                          log.method === 'PUT' ? 'admin-badge-warning' :
                          'admin-badge-danger'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge-sm ${
                          log.statusCode < 300 ? 'admin-badge-success' :
                          log.statusCode < 400 ? 'admin-badge-warning' :
                          'admin-badge-danger'
                        }`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td>
                        <span className={`text-sm font-medium ${
                          log.responseTimeMs < 500 ? 'text-green-600' :
                          log.responseTimeMs < 1000 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {log.responseTimeMs}ms
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{log.ipAddress || '-'}</td>
                      <td>
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={log.userAgent}>
                          {log.userAgent || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center space-x-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left"></i>
                  上一页
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="admin-btn admin-btn-outline admin-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 编辑模态框 */}
      {showEditModal && (
        <EditApiKeyModal
          apiKey={apiKey}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            fetchApiKey();
          }}
        />
      )}
    </div>
  );
}

// 编辑API密钥模态框
interface EditApiKeyModalProps {
  apiKey: ApiKey;
  onClose: () => void;
  onSave: () => void;
}

function EditApiKeyModal({ apiKey, onClose, onSave }: EditApiKeyModalProps) {
  const [formData, setFormData] = useState({
    name: apiKey.name,
    isActive: apiKey.isActive
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) return;

      const response = await fetch(`/api/api-keys/${apiKey.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(error.message || '保存失败');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <i className="fas fa-edit text-white"></i>
              </div>
              编辑API密钥
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
                    更新中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    更新
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