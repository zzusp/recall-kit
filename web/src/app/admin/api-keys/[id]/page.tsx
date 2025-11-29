'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/client/services/toast';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { apiFetch } from '@/lib/client/services/apiErrorHandler';

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

export default function ApiKeyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Use React.use() to unwrap params Promise
  const { id: apiKeyId } = use(params);

  const fetchApiKey = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<ApiKey>(`/api/api-keys/${apiKeyId}`);
      setApiKey(data);
    } catch (error) {
      // apiFetch 已经处理了 toast 提示
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 如果 session 还在加载中，等待
    if (status === 'loading') {
      return;
    }

    // 如果没有 session，重定向到登录页
    if (status === 'unauthenticated' || !session) {
      router.push('/admin/login');
      return;
    }

    fetchApiKey();
  }, [router, session, status, apiKeyId]);

  const handleDeleteApiKey = async () => {
    const confirmed = await confirm({
      title: '删除API密钥',
      message: '确定要删除这个API密钥吗？此操作不可撤销。',
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (!confirmed) return;

    try {
      await apiFetch(`/api/api-keys/${apiKeyId}`, {
        method: 'DELETE'
      });
      router.push('/admin/api-keys');
    } catch (error) {
      // apiFetch 已经处理了 toast 提示
    }
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
      <ConfirmDialogComponent />
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
            <p className="admin-page-subtitle">API密钥详情</p>
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
      <div className="admin-card">
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
      await apiFetch(`/api/api-keys/${apiKey.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      onSave();
    } catch (error) {
      // apiFetch 已经处理了 toast 提示
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