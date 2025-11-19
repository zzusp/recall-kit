'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/services/authClientService';

interface Experience {
  id: string;
  title: string;
  problem_description: string;
  solution: string;
  root_cause: string | null;
  context: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  keywords: string[];
  submitter_username?: string;
  reviewer_username?: string;
}

interface ReviewStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function ReviewPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [batchReviewNote, setBatchReviewNote] = useState('');

  useEffect(() => {
    fetchExperiences();
    fetchStats();
  }, [selectedStatus, searchTerm, page]);

  const fetchExperiences = async () => {
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        review_status: selectedStatus
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/review?${params}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch experiences');
      }

      const data = await response.json();
      setExperiences(data.experiences || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiences');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;

      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/admin/review?review_status=pending&limit=1', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }),
        fetch('/api/admin/review?review_status=approved&limit=1', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }),
        fetch('/api/admin/review?review_status=rejected&limit=1', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        })
      ]);

      const pendingData = await pendingRes.json();
      const approvedData = await approvedRes.json();
      const rejectedData = await rejectedRes.json();

      setStats({
        pending: pendingData.pagination?.total || 0,
        approved: approvedData.pagination?.total || 0,
        rejected: rejectedData.pagination?.total || 0,
        total: (pendingData.pagination?.total || 0) + (approvedData.pagination?.total || 0) + (rejectedData.pagination?.total || 0)
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleBatchReview = async (reviewStatus: 'approved' | 'rejected') => {
    if (selectedExperiences.length === 0) {
      toast.warning('请先选择要审核的经验');
      return;
    }

    if (reviewStatus === 'rejected' && !batchReviewNote.trim()) {
      toast.error('拒绝审核时必须填写审核意见');
      return;
    }

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          experienceIds: selectedExperiences,
          reviewStatus,
          reviewNote: batchReviewNote.trim() || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process batch review');
      }

      const data = await response.json();
      alert(`成功${reviewStatus === 'approved' ? '通过' : '拒绝'} ${selectedExperiences.length} 条经验`);
      
      setSelectedExperiences([]);
      setBatchReviewNote('');
      fetchExperiences();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch review failed');
    }
  };

  const toggleExperienceSelection = (experienceId: string) => {
    setSelectedExperiences(prev => 
      prev.includes(experienceId) 
        ? prev.filter(id => id !== experienceId)
        : [...prev, experienceId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>加载数据中...</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">内容审核</h1>
          <p className="admin-page-subtitle">审核和管理用户提交的经验记录</p>
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

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <StatCard title="待审核" value={stats.pending} icon="fas fa-clock" iconClass="warning" />
        <StatCard title="已通过" value={stats.approved} icon="fas fa-check-circle" iconClass="success" />
        <StatCard title="已拒绝" value={stats.rejected} icon="fas fa-times-circle" iconClass="danger" />
        <StatCard title="总计" value={stats.total} icon="fas fa-chart-bar" iconClass="primary" />
      </div>

      {/* Filters and Actions */}
      <div className="admin-card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              background: 'white'
            }}
          >
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>

          <input
            type="text"
            placeholder="搜索标题或内容..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem'
            }}
          />

          {selectedStatus === 'pending' && selectedExperiences.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="批量审核意见（拒绝时必填）"
                value={batchReviewNote}
                onChange={(e) => setBatchReviewNote(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  minWidth: '250px'
                }}
              />
              <button
                onClick={() => handleBatchReview('approved')}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                批量通过 ({selectedExperiences.length})
              </button>
              <button
                onClick={() => handleBatchReview('rejected')}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                批量拒绝 ({selectedExperiences.length})
              </button>
            </div>
          )}
        </div>

        {/* Experiences List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {experiences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <i className="fas fa-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
              <p>暂无{selectedStatus === 'pending' ? '待审核' : selectedStatus === 'approved' ? '已通过' : '已拒绝'}的经验</p>
            </div>
          ) : (
            experiences.map((experience) => (
              <div
                key={experience.id}
                className="admin-card"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/admin/review/${experience.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {selectedStatus === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedExperiences.includes(experience.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleExperienceSelection(experience.id);
                      }}
                      style={{ marginTop: '0.5rem' }}
                    />
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                        {experience.title}
                      </h3>
                      {getStatusBadge(experience.review_status)}
                    </div>
                    
                    <p style={{ 
                      margin: '0 0 0.5rem 0', 
                      color: '#6b7280', 
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {experience.problem_description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      <span>
                        <i className="fas fa-calendar"></i>
                        {formatDate(experience.created_at)}
                      </span>
                      {experience.keywords.length > 0 && (
                        <span>
                          <i className="fas fa-tags"></i>
                          {experience.keywords.slice(0, 3).join(', ')}
                          {experience.keywords.length > 3 && `...+${experience.keywords.length - 3}`}
                        </span>
                      )}
                      {experience.reviewed_by && (
                        <span>
                          <i className="fas fa-user-check"></i>
                          审核人: {experience.reviewer_username || '未知'}
                        </span>
                      )}
                    </div>

                    {experience.review_note && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        background: '#f3f4f6',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        color: '#374151'
                      }}>
                        <strong>审核意见:</strong> {experience.review_note}
                      </div>
                    )}
                  </div>

                  <i className="fas fa-chevron-right" style={{ color: '#cbd5e1', alignSelf: 'center' }}></i>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '2rem'
          }}>
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e5e7eb',
                background: page === 1 ? '#f9fafb' : 'white',
                borderRadius: '0.375rem',
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              上一页
            </button>
            
            <span style={{ padding: '0.5rem 1rem' }}>
              第 {page} 页，共 {totalPages} 页
            </span>
            
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e5e7eb',
                background: page === totalPages ? '#f9fafb' : 'white',
                borderRadius: '0.375rem',
                cursor: page === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              下一页
            </button>
          </div>
        )}
      </div>
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