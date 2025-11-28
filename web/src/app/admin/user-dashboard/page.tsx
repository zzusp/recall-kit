'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function UserDashboardPage() {
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

    // 如果没有session，重定向到登录页
    if (status === 'unauthenticated' || !session) {
      router.push('/admin/login');
      return;
    }

    // 设置用户信息
    if (session?.user) {
      setUser(session.user as any);
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Fetch dashboard stats (使用 NextAuth.js session)
        const statsResponse = await fetch('/api/admin/user-dashboard/stats', {
          credentials: 'include' // 确保发送 NextAuth.js session cookie
        });

        if (!statsResponse.ok) {
          if (statsResponse.status === 401) {
            router.push('/admin/login');
            return;
          }
          throw new Error('Failed to fetch stats');
        }

        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }

        // Fetch recent experiences (使用 NextAuth.js session)
        const recentResponse = await fetch('/api/admin/user-dashboard/recent-experiences', {
          credentials: 'include' // 确保发送 NextAuth.js session cookie
        });

        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          if (recentData.success) {
            setRecentExperiences(recentData.data.experiences || []);
          }
        } else if (recentResponse.status === 401) {
          router.push('/admin/login');
          return;
        }

        // Fetch popular experiences (public)
        const popularResponse = await fetch('/api/admin/user-dashboard/popular-experiences');
        if (popularResponse.ok) {
          const popularData = await popularResponse.json();
          if (popularData.success) {
            setPopularExperiences(popularData.data.experiences || []);
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router, session, status]);

  // 如果session还在加载中，显示加载状态
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

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">个人仪表盘</h1>
          <p className="admin-page-subtitle">
            欢迎回来，{user?.username || '用户'}！查看您的个人数据和系统动态
          </p>
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

      {/* 个人统计卡片 */}
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
          link="/admin/my-experiences"
          description="最近7天更新的经验"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* 我最近的经验 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <i className="fas fa-history" style={{ marginRight: '0.5rem', color: '#4361ee' }}></i>
              我最近的经验
            </h3>
            <Link href="/admin/my-experiences" className="admin-btn admin-btn-outline admin-btn-sm">
              查看全部
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentExperiences.length > 0 ? recentExperiences.slice(0, 5).map((exp) => (
              <RecentExperienceItem key={exp.id} experience={exp} />
            )) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                <p>暂无经验记录</p>
                <Link href="/admin/my-experiences" className="admin-btn admin-btn-primary admin-btn-sm" style={{ marginTop: '1rem' }}>
                  创建第一个经验
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 热门经验 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <i className="fas fa-fire" style={{ marginRight: '0.5rem', color: '#f39c12' }}></i>
              热门经验
            </h3>
            <Link href="/search" className="admin-btn admin-btn-outline admin-btn-sm" target="_blank">
              浏览更多
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {popularExperiences.length > 0 ? popularExperiences.slice(0, 5).map((exp) => (
              <PopularExperienceItem key={exp.id} experience={exp} />
            )) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                <p>暂无热门经验</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">
          <h3 className="admin-card-title">
            <i className="fas fa-bolt" style={{ marginRight: '0.5rem', color: '#f39c12' }}></i>
            快速操作
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <QuickActionCard
            title="创建新经验"
            description="分享您的开发经验和解决方案"
            icon="fas fa-plus-circle"
            link="/admin/my-experiences?action=create"
            color="#2ecc71"
          />
          <QuickActionCard
            title="浏览经验库"
            description="发现其他开发者的精彩分享"
            icon="fas fa-search"
            link="/search"
            color="#4361ee"
            openInNewTab={true}
          />
          <QuickActionCard
            title="API密钥管理"
            description="管理您的API访问密钥"
            icon="fas fa-key"
            link="/admin/api-keys"
            color="#f39c12"
          />
          <QuickActionCard
            title="个人信息"
            description="管理账户信息和偏好设置"
            icon="fas fa-cog"
            link="/admin/profile-settings"
            color="#64748b"
          />
        </div>
      </div>
    </>
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
  value: number; 
  icon: string; 
  iconClass: string; 
  link: string; 
  description: string;
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
          <span>{description}</span>
        </div>
      </div>
    </Link>
  );
}

function RecentExperienceItem({ experience }: { experience: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#2ecc71';
      case 'draft': return '#f39c12';
      default: return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return '已发布';
      case 'draft': return '草稿';
      default: return '未知';
    }
  };

  return (
    <Link 
      href={`/admin/my-experiences/${experience.id}`} 
      style={{ 
        textDecoration: 'none', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        padding: '1rem',
        borderRadius: '8px',
        transition: 'background 0.2s ease',
        border: '1px solid #e2e8f0'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#4361ee';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ 
          margin: '0 0 0.25rem 0', 
          fontSize: '0.95rem', 
          fontWeight: 600, 
          color: '#1e293b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {experience.title}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          <span 
            style={{ 
              padding: '2px 8px', 
              borderRadius: '4px', 
              background: `${getStatusColor(experience.publish_status)}20`, 
              color: getStatusColor(experience.publish_status),
              fontWeight: 500
            }}
          >
            {getStatusText(experience.publish_status)}
          </span>
          <span>{new Date(experience.updated_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
      <i className="fas fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}></i>
    </Link>
  );
}

function PopularExperienceItem({ experience }: { experience: any }) {
  return (
    <Link 
      href={`/experience/${experience.id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ 
        textDecoration: 'none', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        padding: '1rem',
        borderRadius: '8px',
        transition: 'background 0.2s ease',
        border: '1px solid #e2e8f0'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#4361ee';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ 
          margin: '0 0 0.25rem 0', 
          fontSize: '0.95rem', 
          fontWeight: 600, 
          color: '#1e293b',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {experience.title}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          <span><i className="fas fa-eye"></i> {experience.view_count || 0}</span>
          <span><i className="fas fa-search"></i> {experience.query_count || 0}</span>
          <span>{new Date(experience.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
      <i className="fas fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.8rem' }}></i>
    </Link>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  link,
  color,
  openInNewTab = false
}: {
  title: string;
  description: string;
  icon: string;
  link: string;
  color: string;
  openInNewTab?: boolean;
}) {
  return (
    <Link 
      href={link} 
      style={{ textDecoration: 'none' }}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
    >
      <div className="admin-card" style={{ cursor: 'pointer', textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.8rem',
          margin: '0 auto 1rem auto'
        }}>
          <i className={icon}></i>
        </div>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: '0.5rem'
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '0.85rem',
          color: '#64748b',
          margin: 0,
          lineHeight: 1.4
        }}>
          {description}
        </p>
      </div>
    </Link>
  );
}
