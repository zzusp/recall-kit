'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/components/auth/PermissionGuard';
import { logout, removeSessionToken } from '@/lib/services/authClientService';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, checkPermission } = usePermissions();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout fails
      removeSessionToken();
      router.push('/admin/login');
    }
  };

  const navItems = [
    {
      href: '/admin/dashboard',
      label: '仪表板',
      icon: 'fas fa-chart-line',
    },
    {
      href: '/admin/users',
      label: '用户管理',
      icon: 'fas fa-users',
    },
    {
      href: '/admin/roles',
      label: '角色管理',
      icon: 'fas fa-user-tag',
    },
    {
      href: '/admin/permissions',
      label: '权限管理',
      icon: 'fas fa-key',
    },
    {
      href: '/admin/api-keys',
      label: 'API密钥管理',
      icon: 'fas fa-code',
    },
    {
      href: '/admin/review',
      label: '内容审核',
      icon: 'fas fa-clipboard-check',
    },
    {
      href: '/admin/my-experiences',
      label: '个人经验',
      icon: 'fas fa-book-open',
    },
    {
      href: '/admin/settings',
      label: '系统设置',
      icon: 'fas fa-cog',
    },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div className="admin-logo">
          <i className="fas fa-shield-alt"></i>
          <span>管理后台</span>
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-user-info">
          <div className="admin-user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="admin-user-details">
            <div className="admin-user-name">{user?.username || '管理员'}</div>
            <div className="admin-user-email">{user?.email || 'Loading...'}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="admin-signout-btn"
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}

