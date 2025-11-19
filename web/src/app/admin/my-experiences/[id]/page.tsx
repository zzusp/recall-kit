'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/services/authClientService';

interface Experience {
  id: string;
  user_id: string;
  title: string;
  problem_description: string;
  root_cause?: string;
  solution: string;
  context?: string;
  publish_status: 'published' | 'draft';
  is_deleted: boolean;
  query_count: number;
  view_count: number;
  relevance_score?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  keywords: string[];
}

export default function ExperienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExperience = async () => {
      setIsLoading(true);
      setError('');

      try {
        const sessionToken = getSessionToken();
        if (!sessionToken) {
          router.push('/admin/login');
          return;
        }

        const response = await fetch(`/api/admin/my-experiences/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('经验不存在');
          }
          throw new Error('获取经验详情失败');
        }

        const data = await response.json();
        setExperience(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取经验详情失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchExperience();
    }
  }, [params.id, router]);

  const handleAction = async (action: 'publish' | 'unpublish' | 'delete' | 'restore') => {
    if (!experience) return;

    const confirmMessage = {
      'publish': '确定要发布这个经验吗？发布后将可以在搜索中被找到。',
      'unpublish': '确定要取消发布这个经验吗？取消发布后将不再在搜索中显示。',
      'delete': '确定要删除这个经验吗？删除后可以恢复。',
      'restore': '确定要恢复这个经验吗？恢复后将变为草稿状态。'
    };

    if (!confirm(confirmMessage[action])) {
      return;
    }

    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/my-experiences/${experience.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '操作失败');
      }

      const result = await response.json();
      alert(result.message);
      
      // 更新本地状态
      setExperience(prev => prev ? { ...prev, ...result.data } : null);
      
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const getStatusBadge = () => {
    if (!experience) return null;
    
    if (experience.is_deleted) {
      return <span className="admin-badge admin-badge-danger">已删除</span>;
    }
    if (experience.publish_status === 'published') {
      return <span className="admin-badge admin-badge-success">已发布</span>;
    }
    return <span className="admin-badge admin-badge-warning">草稿</span>;
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

  if (error || !experience) {
    return (
      <div className="admin-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: '#dc2626', marginBottom: '1rem' }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem' }}></i>
        </div>
        <h3 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>加载失败</h3>
        <p style={{ color: '#64748b', marginBottom: '1rem' }}>{error || '经验不存在'}</p>
        <button
          onClick={() => router.back()}
          style={{
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          返回上一页
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 className="admin-page-title" style={{ margin: 0 }}>经验详情</h1>
              {getStatusBadge()}
            </div>
            <p className="admin-page-subtitle">查看您提交的技术经验详情</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-arrow-left"></i> 返回
            </button>
            
            {!experience.is_deleted && (
              <>
                {experience.publish_status === 'draft' ? (
                  <button
                    onClick={() => handleAction('publish')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-share"></i> 发布
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('unpublish')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-eye-slash"></i> 取消发布
                  </button>
                )}
                
                {experience.publish_status === 'draft' && (
                  <button
                    onClick={() => handleAction('delete')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-trash"></i> 删除
                  </button>
                )}
              </>
            )}
            
            {experience.is_deleted && (
              <button
                onClick={() => handleAction('restore')}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-undo"></i> 恢复
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div className="admin-card">
        <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          基本信息
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <InfoItem
            label="经验ID"
            value={experience.id}
            icon="fas fa-fingerprint"
          />
          <InfoItem
            label="创建时间"
            value={new Date(experience.created_at).toLocaleString()}
            icon="fas fa-calendar-plus"
          />
          <InfoItem
            label="最后更新"
            value={new Date(experience.updated_at).toLocaleString()}
            icon="fas fa-calendar-edit"
          />
          <InfoItem
            label="浏览次数"
            value={`${experience.view_count} 次`}
            icon="fas fa-eye"
          />
          <InfoItem
            label="查询次数"
            value={`${experience.query_count} 次`}
            icon="fas fa-search"
          />
          {experience.deleted_at && (
            <InfoItem
              label="删除时间"
              value={new Date(experience.deleted_at).toLocaleString()}
              icon="fas fa-calendar-times"
            />
          )}
        </div>
      </div>

      {/* 关键词 */}
      {experience.keywords.length > 0 && (
        <div className="admin-card">
          <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
            关键词
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {experience.keywords.map((keyword, index) => (
              <span
                key={index}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: '#e0e7ff',
                  color: '#3730a3',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 标题 */}
      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <i className="fas fa-heading"></i> 标题
        </h3>
        <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', lineHeight: 1.6 }}>
          {experience.title}
        </div>
      </div>

      {/* 问题描述 */}
      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <i className="fas fa-exclamation-triangle"></i> 问题描述
        </h3>
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '0.5rem', 
          padding: '1rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap'
        }}>
          {experience.problem_description}
        </div>
      </div>

      {/* 根本原因 */}
      {experience.root_cause && (
        <div className="admin-card">
          <h3 style={{ marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
            <i className="fas fa-search"></i> 根本原因
          </h3>
          <div style={{ 
            background: '#fefce8', 
            border: '1px solid #fde047', 
            borderRadius: '0.5rem', 
            padding: '1rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}>
            {experience.root_cause}
          </div>
        </div>
      )}

      {/* 解决方案 */}
      <div className="admin-card">
        <h3 style={{ marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <i className="fas fa-lightbulb"></i> 解决方案
        </h3>
        <div style={{ 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0', 
          borderRadius: '0.5rem', 
          padding: '1rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap'
        }}>
          {experience.solution}
        </div>
      </div>

      {/* 背景信息 */}
      {experience.context && (
        <div className="admin-card">
          <h3 style={{ marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
            <i className="fas fa-info-circle"></i> 背景信息
          </h3>
          <div style={{ 
            background: '#f8fafc', 
            border: '1px solid #e2e8f0', 
            borderRadius: '0.5rem', 
            padding: '1rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}>
            {experience.context}
          </div>
        </div>
      )}

      {/* 操作提示 */}
      <div className="admin-card" style={{ 
        background: '#eff6ff', 
        border: '1px solid #dbeafe',
        color: '#1e40af'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <i className="fas fa-info-circle" style={{ marginTop: '0.125rem' }}></i>
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>操作说明</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: 1.6 }}>
              <li>发布状态的经验可以在搜索页被其他用户搜索到</li>
              <li>草稿状态的经验仅您自己可见，不会被向量化</li>
              <li>已发布的经验需要先取消发布才能删除</li>
              <li>删除后的经验将标记为已删除，不再参与任何搜索</li>
              <li>已删除的经验可以恢复，恢复后将变为草稿状态</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoItem({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string | number; 
  icon: string;
}) {
  return (
    <div>
      <div style={{ 
        fontSize: '0.875rem', 
        color: '#64748b', 
        marginBottom: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <i className={icon}></i>
        {label}
      </div>
      <div style={{ 
        fontSize: '1rem', 
        color: '#1f2937', 
        fontWeight: 500,
        wordBreak: 'break-word'
      }}>
        {value}
      </div>
    </div>
  );
}