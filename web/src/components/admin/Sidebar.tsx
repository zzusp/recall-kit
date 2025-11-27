'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/components/auth/PermissionGuard';
import { logout, removeSessionToken } from '@/lib/client/services/auth';

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
      href: '/admin/user-dashboard',
      label: '个人仪表盘',
      icon: 'fas fa-tachometer-alt',
      // 个人仪表盘只需要登录即可访问，不需要特殊权限
      permission: null
    },
    {
      href: '/admin/dashboard',
      label: '管理仪表板',
      icon: 'fas fa-chart-line',
      permission: { resource: 'admin', action: 'dashboard' }
    },
    {
      href: '/admin/users',
      label: '用户管理',
      icon: 'fas fa-users',
      permission: { resource: 'users', action: 'view' }
    },
    {
      href: '/admin/roles',
      label: '角色管理',
      icon: 'fas fa-user-tag',
      permission: { resource: 'roles', action: 'view' }
    },
    {
      href: '/admin/permissions',
      label: '权限管理',
      icon: 'fas fa-key',
      permission: { resource: 'permissions', action: 'view' }
    },
    {
      href: '/admin/api-keys',
      label: 'API密钥管理',
      icon: 'fas fa-code',
      permission: { resource: 'api-keys', action: 'view' }
    },
    {
      href: '/admin/my-experiences',
      label: '个人经验',
      icon: 'fas fa-book-open',
      // 个人经验页面不需要特殊权限，只要登录即可访问
      permission: null
    },
    {
      href: '/admin/profile-settings',
      label: '个人信息',
      icon: 'fas fa-user-cog',
      // 个人信息页面不需要特殊权限，只要登录即可访问
      permission: null
    },
    {
      href: '/admin/settings',
      label: '系统设置',
      icon: 'fas fa-cogs',
      permission: { resource: 'admin', action: 'settings' }
    },
  ];

  // 过滤用户有权限的菜单项
  const filteredNavItems = navItems.filter(item => {
    // 如果没有权限要求，直接显示
    if (!item.permission) return true;
    
    // 超级管理员可以看到所有菜单
    if (user?.is_superuser) return true;
    
    // 检查用户是否有对应权限
    return checkPermission(item.permission.resource, item.permission.action);
  });

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div className="admin-logo">
          <i className="fas fa-shield-alt"></i>
          <span>管理后台</span>
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        {filteredNavItems.map((item) => {
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
