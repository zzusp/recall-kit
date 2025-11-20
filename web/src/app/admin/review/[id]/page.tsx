'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSessionToken } from '@/lib/services/authClientService';
import { toast } from '@/lib/services/internal/toastService';

interface Experience {
  id: string;
  title: string;
  problem_description: string;
  root_cause: string | null;
  solution: string;
  context: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  keywords: string[];
  submitter_username?: string;
  reviewer_username?: string;
}

export default function ExperienceReviewPage() {
  const router = useRouter();
  const params = useParams();
  const experienceId = params.id as string;
  
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchExperience();
  }, [experienceId]);

  const fetchExperience = async () => {
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/review/${experienceId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('经验记录不存在');
        } else {
          throw new Error('Failed to fetch experience');
        }
        return;
      }

      const data = await response.json();
      setExperience(data.experience);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experience');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (reviewStatus: 'approved' | 'rejected') => {
    if (reviewStatus === 'rejected' && !reviewNote.trim()) {
      toast.error('拒绝审核时必须填写审核意见');
      return;
    }

    setIsSubmitting(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/review/${experienceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          reviewStatus,
          reviewNote: reviewNote.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to review experience');
      }

      const data = await response.json();
      toast.success(`成功${reviewStatus === 'approved' ? '通过' : '拒绝'}审核`);
      
      // Update local state
      if (experience) {
        setExperience({
          ...experience,
          review_status: reviewStatus,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote.trim() || null
        });
      }
      
      // Redirect back to review list after a short delay
      setTimeout(() => {
        router.push('/admin/review');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setIsSubmitting(false);
    }
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

  if (error || !experience) {
    return (
      <>
        <div className="admin-page-header">
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="fas fa-arrow-left"></i>
            返回
          </button>
        </div>
        
        <div className="admin-card" style={{ background: '#fee2e2', borderColor: '#fecaca' }}>
          <div style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-exclamation-circle"></i>
            <span>{error || '经验记录不存在'}</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="fas fa-arrow-left"></i>
            返回
          </button>
          <div>
            <h1 className="admin-page-title">经验审核</h1>
            <p className="admin-page-subtitle">审核经验记录详情</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getStatusBadge(experience.review_status)}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem' }}>
        {/* Experience Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Title Section */}
          <div className="admin-card">
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 600 }}>
              {experience.title}
            </h2>
            
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              <span>
                <i className="fas fa-calendar"></i>
                提交时间: {formatDate(experience.created_at)}
              </span>
              {experience.submitter_username && (
                <span>
                  <i className="fas fa-user"></i>
                  提交者: {experience.submitter_username}
                </span>
              )}
            </div>

            {experience.keywords.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {experience.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#f3f4f6',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#374151'
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Problem Description */}
          <div className="admin-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b', marginRight: '0.5rem' }}></i>
              问题描述
            </h3>
            <div style={{ 
              lineHeight: 1.6, 
              whiteSpace: 'pre-wrap',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb'
            }}>
              {experience.problem_description}
            </div>
          </div>

          {/* Root Cause */}
          {experience.root_cause && (
            <div className="admin-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                <i className="fas fa-search" style={{ color: '#3b82f6', marginRight: '0.5rem' }}></i>
                根本原因
              </h3>
              <div style={{ 
                lineHeight: 1.6, 
                whiteSpace: 'pre-wrap',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb'
              }}>
                {experience.root_cause}
              </div>
            </div>
          )}

          {/* Solution */}
          <div className="admin-card">
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
              <i className="fas fa-lightbulb" style={{ color: '#10b981', marginRight: '0.5rem' }}></i>
              解决方案
            </h3>
            <div style={{ 
              lineHeight: 1.6, 
              whiteSpace: 'pre-wrap',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb'
            }}>
              {experience.solution}
            </div>
          </div>

          {/* Context */}
          {experience.context && (
            <div className="admin-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                <i className="fas fa-info-circle" style={{ color: '#6b7280', marginRight: '0.5rem' }}></i>
                上下文信息
              </h3>
              <div style={{ 
                lineHeight: 1.6, 
                whiteSpace: 'pre-wrap',
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '0.375rem',
                border: '1px solid #e5e7eb'
              }}>
                {experience.context}
              </div>
            </div>
          )}

          {/* Existing Review Info */}
          {experience.review_status !== 'pending' && (
            <div className="admin-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                <i className="fas fa-clipboard-check" style={{ color: '#8b5cf6', marginRight: '0.5rem' }}></i>
                审核信息
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <strong>审核状态:</strong> {getStatusBadge(experience.review_status)}
                </div>
                {experience.reviewed_at && (
                  <div>
                    <strong>审核时间:</strong> {formatDate(experience.reviewed_at)}
                  </div>
                )}
                {experience.reviewer_username && (
                  <div>
                    <strong>审核人:</strong> {experience.reviewer_username}
                  </div>
                )}
                {experience.review_note && (
                  <div>
                    <strong>审核意见:</strong>
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '0.375rem',
                      lineHeight: 1.5
                    }}>
                      {experience.review_note}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Review Actions */}
        {experience.review_status === 'pending' && (
          <div style={{ position: 'sticky', top: '1rem' }}>
            <div className="admin-card">
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                审核操作
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    审核意见 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="请输入审核意见..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.375rem',
                      resize: 'vertical',
                      fontSize: '0.875rem',
                      lineHeight: 1.5
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    拒绝审核时必须填写审核意见
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleReview('approved')}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isSubmitting ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-check"></i>
                    )}
                    通过审核
                  </button>
                  
                  <button
                    onClick={() => handleReview('rejected')}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isSubmitting ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-times"></i>
                    )}
                    拒绝审核
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}