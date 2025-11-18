'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken } from '@/lib/services/newAuthService';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalExperiences: 0,
    publishedExperiences: 0,
    deletedExperiences: 0,
    recentSubmissions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Get session token
        const sessionToken = getSessionToken();
        if (!sessionToken) {
          router.push('/admin/login');
          return;
        }

        // Fetch stats from API
        const [
          totalResponse,
          publishedResponse,
          deletedResponse,
          recentResponse
        ] = await Promise.all([
          fetch('/api/admin/experiences?limit=1&page=1', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          }),
          fetch('/api/admin/experiences?status=published&limit=1&page=1', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          }),
          fetch('/api/admin/experiences?status=deleted&limit=1&page=1', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          }),
          fetch('/api/admin/experiences?status=published&limit=1&page=1', {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          })
        ]);

        if (!totalResponse.ok || !publishedResponse.ok || !deletedResponse.ok || !recentResponse.ok) {
          throw new Error('Failed to fetch stats');
        }

        const totalData = await totalResponse.json();
        const publishedData = await publishedResponse.json();
        const deletedData = await deletedResponse.json();
        const recentData = await recentResponse.json();

        setStats({
          totalExperiences: totalData.pagination?.total || 0,
          publishedExperiences: publishedData.pagination?.total || 0,
          deletedExperiences: deletedData.pagination?.total || 0,
          recentSubmissions: recentData.pagination?.total || 0, // Note: This should be filtered by date in API
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (isLoading) {
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
          <h1 className="admin-page-title">仪表板</h1>
          <p className="admin-page-subtitle">系统概览和统计数据</p>
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

      <div className="admin-stats-grid">
        <StatCard
          title="总经验数"
          value={stats.totalExperiences}
          icon="fas fa-book"
          iconClass="primary"
          link="/admin/review"
          change="全部记录"
        />
        <StatCard
          title="已发布"
          value={stats.publishedExperiences}
          icon="fas fa-check-circle"
          iconClass="success"
          link="/admin/review?status=published"
          change="已审核通过"
        />
        <StatCard
          title="已删除"
          value={stats.deletedExperiences}
          icon="fas fa-trash"
          iconClass="danger"
          link="/admin/review?status=deleted"
          change="已标记删除"
        />
        <StatCard
          title="最近7天"
          value={stats.recentSubmissions}
          icon="fas fa-clock"
          iconClass="warning"
          link="/admin/review?status=published&sort=recent"
          change="新增提交"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <QuickActionCard
          title="内容审核"
          description="审核和管理用户提交的经验记录"
          icon="fas fa-clipboard-check"
          link="/admin/review"
          color="#4361ee"
        />
        <QuickActionCard
          title="系统设置"
          description="配置系统参数和AI服务集成"
          icon="fas fa-cog"
          link="/admin/settings"
          color="#64748b"
        />
      </div>
    </>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  iconClass, 
  link, 
  change 
}: { 
  title: string; 
  value: number; 
  icon: string; 
  iconClass: string; 
  link: string; 
  change: string;
}) {
  return (
    <Link href={link} style={{ textDecoration: 'none' }}>
      <div className="admin-stat-card">
        <div className="admin-stat-header">
          <div className="admin-stat-title">{title}</div>
          <div className={`admin-stat-icon ${iconClass}`}>
            <i className={icon}></i>
          </div>
        </div>
        <div className="admin-stat-value">{value.toLocaleString()}</div>
        <div className="admin-stat-change">
          <i className="fas fa-info-circle"></i>
          <span>{change}</span>
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  link,
  color
}: {
  title: string;
  description: string;
  icon: string;
  link: string;
  color: string;
}) {
  return (
    <Link href={link} style={{ textDecoration: 'none' }}>
      <div className="admin-card" style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            flexShrink: 0
          }}>
            <i className={icon}></i>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              {title}
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.5
            }}>
              {description}
            </p>
          </div>
          <i className="fas fa-chevron-right" style={{ color: '#cbd5e1', alignSelf: 'center' }}></i>
        </div>
      </div>
    </Link>
  );
}