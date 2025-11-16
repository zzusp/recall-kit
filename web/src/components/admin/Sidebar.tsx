'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/services/authService';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const navItems = [
    {
      href: '/admin/dashboard',
      label: '仪表板',
      icon: 'fas fa-chart-line',
    },
    {
      href: '/admin/review',
      label: '内容审核',
      icon: 'fas fa-clipboard-check',
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
            <div className="admin-user-name">管理员</div>
            <div className="admin-user-email">{userEmail || 'Loading...'}</div>
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

