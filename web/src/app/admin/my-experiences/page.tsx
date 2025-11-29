'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/client/services/toast';
import Link from 'next/link';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { apiFetch } from '@/lib/client/services/apiErrorHandler';

interface Experience {
  id: string;
  title: string;
  problem_description: string;
  root_cause?: string;
  solution: string;
  context?: string;
  publish_status: 'published' | 'draft';
  is_deleted: boolean;
  query_count: number;
  view_count: number;
  has_embedding: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  keywords: string[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type StatusFilter = 'all' | 'published' | 'draft' | 'deleted';

function MyExperiencesContent() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const fetchExperiences = async (page: number = 1, status: StatusFilter = 'all') => {
    setIsLoading(true);
    setError('');

    try {
      const data = await apiFetch<{ experiences: Experience[]; pagination: PaginationInfo }>(
        `/api/admin/my-experiences?page=${page}&limit=10&status=${status}`
      );
      if (data && typeof data === 'object' && 'experiences' in data) {
        setExperiences(data.experiences);
        setPagination(data.pagination);
      }
    } catch (err) {
      // apiFetch 已经处理了 toast 提示，这里只设置本地错误状态
      setError(err instanceof Error ? err.message : '获取经验列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleAction = async (experienceId: string, action: 'publish' | 'unpublish' | 'delete' | 'restore') => {
    const confirmConfig = {
      'publish': {
        title: '发布经验',
        message: '确定要发布这个经验吗？发布后将可以在搜索中被找到。',
        type: 'info' as const,
        confirmText: '发布',
        cancelText: '取消'
      },
      'unpublish': {
        title: '取消发布',
        message: '确定要取消发布这个经验吗？取消发布后将不再在搜索中显示。',
        type: 'warning' as const,
        confirmText: '取消发布',
        cancelText: '返回'
      },
      'delete': {
        title: '删除经验',
        message: '确定要删除这个经验吗？删除后可以恢复。',
        type: 'danger' as const,
        confirmText: '删除',
        cancelText: '取消'
      },
      'restore': {
        title: '恢复经验',
        message: '确定要恢复这个经验吗？恢复后将变为草稿状态。',
        type: 'info' as const,
        confirmText: '恢复',
        cancelText: '取消'
      }
    };

    const confirmed = await confirm(confirmConfig[action]);
    if (!confirmed) return;

    try {
      await apiFetch(`/api/admin/my-experiences/${experienceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      // 刷新列表
      fetchExperiences(currentPage, statusFilter);
    } catch (err) {
      // apiFetch 已经处理了 toast 提示
    }
  };

  const handleEmbeddingAction = async (experienceId: string, action: 'generate' | 'clear') => {
    const confirmConfig = {
      'generate': {
        title: '生成向量化数据',
        message: '确定要为这个经验生成向量化数据吗？这可能需要一些时间并产生API费用。',
        type: 'warning' as const,
        confirmText: '生成',
        cancelText: '取消'
      },
      'clear': {
        title: '清除向量化数据',
        message: '确定要清除这个经验的向量化数据吗？清除后将影响基于语义的搜索效果。',
        type: 'warning' as const,
        confirmText: '清除',
        cancelText: '取消'
      }
    };

    const confirmed = await confirm(confirmConfig[action]);
    if (!confirmed) return;

    try {
      const result = await apiFetch<{ message?: string }>(`/api/admin/my-experiences/${experienceId}/embedding`, {
        method: action === 'generate' ? 'POST' : 'DELETE'
      });
      
      toast.success(result?.message || (action === 'generate' ? '向量化成功' : '向量化数据已清除'));
      
      // 刷新列表
      fetchExperiences(currentPage, statusFilter);
    } catch (err) {
      // apiFetch 已经处理了 toast 提示
    }
  };

  const getStatusBadge = (experience: Experience) => {
    if (experience.is_deleted) {
      return <span className="admin-badge admin-badge-danger">已删除</span>;
    }
    if (experience.publish_status === 'published') {
      return <span className="admin-badge admin-badge-success">已发布</span>;
    }
    return <span className="admin-badge admin-badge-warning">草稿</span>;
  };

  const getStatusText = () => {
    switch (statusFilter) {
      case 'published': return '已发布';
      case 'draft': return '草稿';
      case 'deleted': return '已删除';
      default: return '全部';
    }
  };

  if (isLoading && experiences.length === 0) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialogComponent />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">个人经验管理</h1>
          <p className="admin-page-subtitle">管理您提交的技术经验</p>
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

      {/* 状态过滤器 */}
      <div className="admin-card">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#374151' }}>筛选状态：</span>
          {(['all', 'published', 'draft', 'deleted'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`admin-filter-btn ${statusFilter === status ? 'active' : ''}`}
            >
              {status === 'all' ? '全部' : 
               status === 'published' ? '已发布' : 
               status === 'draft' ? '草稿' : '已删除'}
            </button>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      {pagination && (
        <div className="admin-stats-grid">
          <StatCard
            title={`${getStatusText()}经验数`}
            value={pagination.total}
            icon="fas fa-book"
            iconClass="primary"
          />
          <StatCard
            title="当前页显示"
            value={experiences.length}
            icon="fas fa-eye"
            iconClass="info"
          />
        </div>
      )}

      {/* 经验列表 */}
      <div className="admin-card">
        <h3 style={{ marginBottom: '1.5rem', color: '#1e293b' }}>
          经验列表 ({getStatusText()})
        </h3>
        
        {experiences.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: '#64748b',
            background: '#f8fafc',
            borderRadius: '0.5rem'
          }}>
            <i className="fas fa-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>暂无经验</p>
            <p style={{ fontSize: '0.875rem' }}>您还没有提交任何经验</p>
          </div>
        ) : (
          <div style={{ 
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9',
            maxWidth: '100%'
          }}>
            <style jsx>{`
              div::-webkit-scrollbar {
                height: 8px;
              }
              div::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              div::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: '#94a3b8';
              }
            `}</style>
            <table className="admin-table" style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th>标题</th>
                  <th>状态</th>
                  <th>关键词</th>
                  <th>浏览/查询</th>
                  <th>向量化</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {experiences.map((experience) => (
                  <tr key={experience.id}>
                    <td>
                      <div style={{ maxWidth: '300px' }}>
                        <Link
                          href={`/admin/my-experiences/${experience.id}`}
                          style={{ 
                            color: '#2563eb', 
                            textDecoration: 'none', 
                            fontWeight: 500,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {experience.title}
                        </Link>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#64748b', 
                          marginTop: '0.25rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {experience.problem_description.substring(0, 100)}...
                        </div>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(experience)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {experience.keywords.slice(0, 3).map((keyword, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.125rem 0.375rem',
                              background: '#e0e7ff',
                              color: '#3730a3',
                              borderRadius: '0.25rem'
                            }}
                          >
                            {keyword}
                          </span>
                        ))}
                        {experience.keywords.length > 3 && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            +{experience.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>👁 {experience.view_count}</div>
                        <div>🔍 {experience.query_count}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {experience.has_embedding ? (
                          <span style={{
                            padding: '0.125rem 0.375rem',
                            fontSize: '0.75rem',
                            background: '#dcfce7',
                            color: '#166534',
                            borderRadius: '0.25rem'
                          }}>
                            ✓ 已向量化
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.125rem 0.375rem',
                            fontSize: '0.75rem',
                            background: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '0.25rem'
                          }}>
                            ✗ 未向量化
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        <div>{new Date(experience.created_at).toLocaleDateString()}</div>
                        <div>{new Date(experience.created_at).toLocaleTimeString()}</div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-action-buttons">
                        <Link
                          href={`/admin/my-experiences/${experience.id}`}
                          className="admin-btn admin-btn-outline admin-btn-info admin-btn-sm"
                        >
                          <i className="fas fa-eye"></i>
                          查看
                        </Link>

                        {/* 向量化操作按钮 */}
                        {!experience.is_deleted && (
                          <>
                            {!experience.has_embedding ? (
                              <button
                                onClick={() => handleEmbeddingAction(experience.id, 'generate')}
                                className="admin-btn admin-btn-outline admin-btn-primary-outline admin-btn-sm"
                                title="生成向量化数据，提升语义搜索效果"
                              >
                                <i className="fas fa-robot"></i>
                                向量化
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleEmbeddingAction(experience.id, 'clear');
                                }}
                                className="admin-btn admin-btn-outline admin-btn-warning-outline admin-btn-sm"
                                title="清除向量化数据"
                                type="button"
                                style={{ 
                                  pointerEvents: 'auto', 
                                  cursor: 'pointer',
                                  zIndex: 1000,
                                  position: 'relative'
                                }}
                              >
                                <i className="fas fa-trash"></i>
                                清除向量
                              </button>
                            )}
                          </>
                        )}
                        
                        {!experience.is_deleted && (
                          <>
                            {experience.publish_status === 'draft' ? (
                              <button
                                onClick={() => handleAction(experience.id, 'publish')}
                                className="admin-btn admin-btn-outline admin-btn-success-outline admin-btn-sm"
                              >
                                <i className="fas fa-upload"></i>
                                发布
                              </button>
                            ) : experience.publish_status === 'published' ? (
                              <button
                                onClick={() => handleAction(experience.id, 'unpublish')}
                                className="admin-btn admin-btn-outline admin-btn-warning-outline admin-btn-sm"
                              >
                                <i className="fas fa-download"></i>
                                取消发布
                              </button>
                            ) : null}
                            
                            {experience.publish_status === 'draft' && (
                              <button
                                onClick={() => handleAction(experience.id, 'delete')}
                                className="admin-btn admin-btn-outline admin-btn-danger-outline admin-btn-sm"
                              >
                                <i className="fas fa-trash"></i>
                                删除
                              </button>
                            )}
                          </>
                        )}
                        
                        {experience.is_deleted && (
                          <button
                            onClick={() => handleAction(experience.id, 'restore')}
                            className="admin-btn admin-btn-outline admin-btn-success-outline admin-btn-sm"
                          >
                            <i className="fas fa-undo"></i>
                            恢复
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(currentPage - 1)}
            style={{
              padding: '0.5rem 1rem',
              background: pagination.hasPrev ? '#f3f4f6' : '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              cursor: pagination.hasPrev ? 'pointer' : 'not-allowed'
            }}
          >
            上一页
          </button>
          
          <span style={{ 
            padding: '0 1rem', 
            color: '#374151',
            fontSize: '0.875rem'
          }}>
            第 {currentPage} 页，共 {pagination.totalPages} 页
          </span>
          
          <button
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(currentPage + 1)}
            style={{
              padding: '0.5rem 1rem',
              background: pagination.hasNext ? '#f3f4f6' : '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              cursor: pagination.hasNext ? 'pointer' : 'not-allowed'
            }}
          >
            下一页
          </button>
        </div>
      )}
    </>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  iconClass 
}: { 
  title: string; 
  value: number; 
  icon: string; 
  iconClass: string;
}) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-header">
        <div className="admin-stat-title">{title}</div>
        <div className={`admin-stat-icon ${iconClass}`}>
          <i className={icon}></i>
        </div>
      </div>
      <div className="admin-stat-value">{value.toLocaleString()}</div>
    </div>
  );
}

export default function MyExperiencesPage() {
  return (
    <PermissionGuard requireAuth={true}>
      <MyExperiencesContent />
    </PermissionGuard>
  );
}