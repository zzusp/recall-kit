'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/services/newAuthService';
import { ExperienceRecord } from '@/lib/services/experienceService';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminReviewPage() {
  return (
    <Suspense fallback={
      <div className="admin-loading">
        <div className="admin-loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>加载中...</p>
      </div>
    }>
      <ReviewContentInner />
    </Suspense>
  );
}

function ReviewContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const status = searchParams.get('status') || 'published';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  useEffect(() => {
    const fetchExperiences = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Get session token
        const sessionToken = getSessionToken();
        if (!sessionToken) {
          router.push('/admin/login');
          return;
        }

        // Fetch experiences with admin access
        const response = await fetch(`/api/admin/experiences?status=${status}&limit=${limit}&page=${page}`, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch experiences');
        }

        const data = await response.json();
        
        const formattedExperiences = (data.experiences || []).map((record: any) => ({
          ...record,
          keywords: record.keywords || [],
          author: record.user_id ? { 
            id: record.user_id,
            username: record.user_id, // Fallback - in real implementation you'd fetch user details
            email: record.user_id
          } : null
        }));

        setExperiences(formattedExperiences);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载经验记录失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExperiences();
  }, [status, page, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/experiences/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ status: 'deleted' }),
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      setExperiences(prev => prev.filter(exp => exp.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/experiences/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ status: 'published' }),
      });

      if (!response.ok) {
        throw new Error('恢复失败');
      }

      setExperiences(prev => prev.filter(exp => exp.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '恢复失败');
    }
  };

  const handleGenerateEmbedding = async (id: string) => {
    try {
      const response = await fetch(`/api/experiences/${id}/embedding`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '向量化失败');
      }

      // Update the experience in local state
      setExperiences(prev => prev.map(exp => 
        exp.id === id 
          ? { ...exp, has_embedding: true } as any
          : exp
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : '向量化失败');
      throw err; // Re-throw to let component handle loading state
    }
  };

  if (isLoading) {
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
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">内容审核</h1>
          <p className="admin-page-subtitle">管理和审核用户提交的经验记录</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select
            value={status}
            onChange={(e) => router.push(`/admin/review?status=${e.target.value}`)}
            className="admin-form-select"
            style={{ minWidth: '150px' }}
          >
            <option value="all">全部状态</option>
            <option value="published">已发布</option>
            <option value="deleted">已删除</option>
          </select>
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

      {experiences.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-state-icon">
            <i className="fas fa-inbox"></i>
          </div>
          <div className="admin-empty-state-title">暂无记录</div>
          <div className="admin-empty-state-description">
            当前筛选条件下没有找到任何经验记录
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {experiences.map(experience => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onGenerateEmbedding={handleGenerateEmbedding}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ExperienceCard({
  experience,
  onDelete,
  onRestore,
  onGenerateEmbedding
}: {
  experience: ExperienceRecord & { keywords?: string[]; author?: any };
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onGenerateEmbedding: (id: string) => void;
}) {
  const router = useRouter();
  const isDeleted = experience.status === 'deleted';
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);
  // Use has_embedding flag to check if experience has been vectorized
  const hasEmbedding = (experience as any).has_embedding === true;

  const handleGenerateEmbeddingClick = async () => {
    setIsGeneratingEmbedding(true);
    try {
      await onGenerateEmbedding(experience.id);
    } finally {
      setIsGeneratingEmbedding(false);
    }
  };

  return (
    <div className="admin-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e293b',
              margin: 0
            }}>
              {experience.title}
            </h3>
            <span className={`admin-badge ${isDeleted ? 'admin-badge-danger' : 'admin-badge-success'}`}>
              {isDeleted ? '已删除' : '已发布'}
            </span>
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: '#64748b',
            margin: 0,
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {experience.problem_description}
          </p>
        </div>
      </div>

      {experience.keywords && experience.keywords.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {experience.keywords.slice(0, 5).map(keyword => (
            <span key={keyword} style={{
              padding: '0.25rem 0.75rem',
              background: '#e0e7ff',
              color: '#4338ca',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 500
            }}>
              {keyword}
            </span>
          ))}
          {experience.keywords.length > 5 && (
            <span style={{
              padding: '0.25rem 0.75rem',
              background: '#f1f5f9',
              color: '#64748b',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 500
            }}>
              +{experience.keywords.length - 5}
            </span>
          )}
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '1rem',
        borderTop: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
          <span>
            <i className="fas fa-user" style={{ marginRight: '0.25rem' }}></i>
            {experience.author?.email || experience.author?.username || '匿名用户'}
          </span>
          <span>
            <i className="fas fa-calendar" style={{ marginRight: '0.25rem' }}></i>
            {new Date(experience.created_at).toLocaleDateString('zh-CN')}
          </span>
          {experience.view_count !== undefined && experience.view_count !== null && (
            <span>
              <i className="fas fa-eye" style={{ marginRight: '0.25rem' }}></i>
              {experience.view_count} 次查看
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!hasEmbedding && !isDeleted && (
            <button
              onClick={handleGenerateEmbeddingClick}
              disabled={isGeneratingEmbedding}
              className="admin-btn admin-btn-outline admin-btn-sm"
              style={{ 
                opacity: isGeneratingEmbedding ? 0.6 : 1,
                cursor: isGeneratingEmbedding ? 'not-allowed' : 'pointer'
              }}
            >
              {isGeneratingEmbedding ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>向量化中...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-brain"></i>
                  <span>向量化</span>
                </>
              )}
            </button>
          )}
          {isDeleted ? (
            <button
              onClick={() => onRestore(experience.id)}
              className="admin-btn admin-btn-success admin-btn-sm"
            >
              <i className="fas fa-undo"></i>
              <span>恢复</span>
            </button>
          ) : (
            <button
              onClick={() => onDelete(experience.id)}
              className="admin-btn admin-btn-danger admin-btn-sm"
            >
              <i className="fas fa-trash"></i>
              <span>删除</span>
            </button>
          )}
          <button
            onClick={() => window.open(`/experience/${experience.id}`, '_blank')}
            className="admin-btn admin-btn-outline admin-btn-sm"
          >
            <i className="fas fa-external-link-alt"></i>
            <span>查看</span>
          </button>
        </div>
      </div>
    </div>
  );
}