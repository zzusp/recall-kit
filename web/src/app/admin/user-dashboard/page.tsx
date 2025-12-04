'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/client/services/toast';
import { apiFetch } from '@/lib/client/services/apiErrorHandler';
import PermissionGuard from '@/components/auth/PermissionGuard';

function UserDashboardContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    myExperiences: 0,
    publishedExperiences: 0,
    draftExperiences: 0,
    totalViews: 0,
    totalQueries: 0,
    recentlyUpdated: 0,
  });
  const [recentExperiences, setRecentExperiences] = useState<any[]>([]);
  const [popularExperiences, setPopularExperiences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 如果session还在加载中，等待
    if (status === 'loading') {
      return;
    }

    // 如果未登录，重定向到登录页
    if (!session) {
      router.push('/admin/login');
      return;
    }

    const loadDashboardData = async () => {
      try {
        // 设置用户信息
        setUser(session.user);

        // Fetch dashboard stats
        const statsData = await apiFetch<typeof stats>('/api/admin/user-dashboard/stats');
        if (statsData && typeof statsData === 'object') {
          // 确保所有字段都有默认值，防止undefined错误
          setStats({
            myExperiences: statsData.myExperiences || 0,
            publishedExperiences: statsData.publishedExperiences || 0,
            draftExperiences: statsData.draftExperiences || 0,
            totalViews: statsData.totalViews || 0,
            totalQueries: statsData.totalQueries || 0,
            recentlyUpdated: statsData.recentlyUpdated || 0,
          });
        }

        // Fetch recent experiences
        const recentData = await apiFetch('/api/admin/user-dashboard/recent-experiences');
        if (Array.isArray(recentData)) {
          setRecentExperiences(recentData);
        }

        // Fetch popular experiences
        const popularData = await apiFetch('/api/admin/user-dashboard/popular-experiences');
        if (Array.isArray(popularData)) {
          setPopularExperiences(popularData);
        }

      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        toast.error('加载仪表板数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [session, status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>加载数据中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-loading">
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ef4444' }}></i>
          <h2>加载失败</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="admin-btn admin-btn-primary"
            style={{ marginTop: '1rem' }}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  function UserStatCard({ 
    title, 
    value, 
    icon, 
    iconClass, 
    link, 
    description 
  }: { 
    title: string; 
    value: number | string; 
    icon: string; 
    iconClass: string; 
    link: string; 
    description: string;
  }) {
    // 安全地处理value，防止undefined错误
    const safeValue = value !== undefined ? value : 0;
    const displayValue = typeof safeValue === 'number' ? safeValue.toLocaleString() : String(safeValue);

    return (
      <a href={link} style={{ textDecoration: 'none' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-title">{title}</div>
            <div className={`admin-stat-icon ${iconClass}`}>
              <i className={icon}></i>
            </div>
          </div>
          <div className="admin-stat-value">{displayValue}</div>
          <div className="admin-stat-change">
            <i className="fas fa-info-circle"></i>
            <span>{description}</span>
          </div>
        </div>
      </a>
    );
  }

  function RecentExperienceItem({ experience }: { experience: any }) {
    return (
      <div className="recent-experience-item">
        <div className="recent-experience-content">
          <h4>{experience.title}</h4>
          <p>{experience.problem_description?.substring(0, 100)}...</p>
          <div className="recent-experience-meta">
            <span className={`status-${experience.status}`}>
              {experience.status === 'published' ? '已发布' : '草稿'}
            </span>
            <span className="date">
              {new Date(experience.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      {/* 页面标题 */}
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>
            <i className="fas fa-tachometer-alt" style={{ marginRight: '0.5rem' }}></i>
            用户仪表板
          </h1>
          <p>
            欢迎回来，{user?.username || '用户'}！这是您的个人工作概览。
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="admin-stats-grid">
        <UserStatCard
          title="我的经验"
          value={stats.myExperiences}
          icon="fas fa-book"
          iconClass="primary"
          link="/admin/my-experiences"
          description="您创建的所有经验"
        />
        <UserStatCard
          title="已发布"
          value={stats.publishedExperiences}
          icon="fas fa-check-circle"
          iconClass="success"
          link="/admin/my-experiences?status=published"
          description="已公开发布的经验"
        />
        <UserStatCard
          title="草稿"
          value={stats.draftExperiences}
          icon="fas fa-edit"
          iconClass="warning"
          link="/admin/my-experiences?status=draft"
          description="未发布的草稿经验"
        />
        <UserStatCard
          title="总浏览量"
          value={stats.totalViews}
          icon="fas fa-eye"
          iconClass="info"
          link="/admin/my-experiences"
          description="您经验的总浏览次数"
        />
        <UserStatCard
          title="总查询量"
          value={stats.totalQueries}
          icon="fas fa-search"
          iconClass="secondary"
          link="/admin/my-experiences"
          description="您经验被查询的次数"
        />
        <UserStatCard
          title="最近更新"
          value={stats.recentlyUpdated}
          icon="fas fa-clock"
          iconClass="info"
          link="/admin/my-experiences?sort=updated"
          description="最近30天内更新的经验"
        />
      </div>

      {/* 内容区域 */}
      <div className="admin-dashboard-content">
        {/* 最近经验 */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-clock" style={{ marginRight: '0.5rem' }}></i>
              最近经验
            </h2>
            <a href="/admin/my-experiences" className="view-all-link">
              查看全部 <i className="fas fa-arrow-right"></i>
            </a>
          </div>
          <div className="recent-experiences">
            {recentExperiences.length > 0 ? (
              recentExperiences.slice(0, 5).map((experience, index) => (
                <RecentExperienceItem key={experience.id} experience={experience} />
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                <p>暂无经验</p>
                <a href="/admin/my-experiences/create" className="btn btn-primary">
                  创建第一个经验
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 热门经验 */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-fire" style={{ marginRight: '0.5rem' }}></i>
              热门经验
            </h2>
            <a href="/admin/my-experiences?sort=views" className="view-all-link">
              查看全部 <i className="fas fa-arrow-right"></i>
            </a>
          </div>
          <div className="popular-experiences">
            {popularExperiences.length > 0 ? (
              popularExperiences.slice(0, 5).map((experience, index) => (
                <div key={experience.id} className="popular-experience-item">
                  <div className="popular-rank">#{index + 1}</div>
                  <div className="popular-content">
                    <h4>{experience.title}</h4>
                    <div className="popular-stats">
                      <span className="views">
                        <i className="fas fa-eye"></i> {experience.view_count || 0}
                      </span>
                      <span className="queries">
                        <i className="fas fa-search"></i> {experience.query_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-chart-line" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                <p>暂无热门数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard-page {
          padding: 2rem;
          min-height: 100vh;
          background: #f8fafc;
        }

        .admin-page-header {
          margin-bottom: 2rem;
        }

        .admin-page-title h1 {
          font-size: 2rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .admin-page-title p {
          color: #718096;
          font-size: 1.1rem;
          margin: 0;
        }

        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .admin-stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .admin-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .admin-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .admin-stat-title {
          font-size: 0.9rem;
          color: #718096;
          font-weight: 500;
        }

        .admin-stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-stat-icon.primary {
          background: #e3f2fd;
          color: #2196f3;
        }

        .admin-stat-icon.success {
          background: #e8f5e8;
          color: #4caf50;
        }

        .admin-stat-icon.warning {
          background: #fff3e0;
          color: #ff9800;
        }

        .admin-stat-icon.info {
          background: #e1f5fe;
          color: #03a9f4;
        }

        .admin-stat-icon.secondary {
          background: #f3e5f5;
          color: #9c27b0;
        }

        .admin-stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .admin-stat-change {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #718096;
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .dashboard-section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .section-header h2 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0;
        }

        .view-all-link {
          color: #4299e1;
          text-decoration: none;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .view-all-link:hover {
          color: #3182ce;
        }

        .recent-experience-item {
          padding: 1rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .recent-experience-item:last-child {
          border-bottom: none;
        }

        .recent-experience-content h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .recent-experience-content p {
          color: #718096;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
        }

        .recent-experience-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }

        .status-published {
          color: #38a169;
          background: #c6f6d5;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .status-draft {
          color: #d69e2e;
          background: #fed7d7;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .date {
          color: #718096;
        }

        .popular-experience-item {
          display: flex;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .popular-experience-item:last-child {
          border-bottom: none;
        }

        .popular-rank {
          width: 30px;
          height: 30px;
          background: #4299e1;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          margin-right: 1rem;
        }

        .popular-content {
          flex: 1;
        }

        .popular-content h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .popular-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #718096;
        }

        .popular-stats span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #718096;
        }

        .empty-state i {
          display: block;
          margin-bottom: 1rem;
        }

        .empty-state p {
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }

          .admin-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <PermissionGuard requireAuth={true}>
      <UserDashboardContent />
    </PermissionGuard>
  );
}
