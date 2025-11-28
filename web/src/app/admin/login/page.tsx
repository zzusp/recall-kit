'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { hasPermission } from '@/lib/client/services/auth';

export default function AdminLogin() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 使用 NextAuth.js 的 signIn 函数
      const result = await signIn('credentials', {
        username: credentials.username,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        setError('用户名或密码错误');
        return;
      }

      if (result?.ok) {
        // 登录成功，等待一下确保 cookie 已设置
        // 需要等待更长时间，确保 NextAuth.js 的 cookie 已写入
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 验证 session 是否已设置
        let retries = 0;
        let session = null;
        while (retries < 5 && !session?.user) {
          const response = await fetch('/api/auth/session', {
            cache: 'no-store',
            credentials: 'include',
          });
          session = await response.json();
          if (!session?.user) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
          }
        }
        
        const currentUser = session?.user;

        if (!currentUser) {
          setError('获取用户信息失败，请重试');
          return;
        }

        // 定义菜单项及其权限要求
        const navItems = [
          {
            href: '/admin/user-dashboard',
            // 个人仪表盘只需要登录即可访问，不需要特殊权限
            permission: null
          },
          {
            href: '/admin/dashboard',
            permission: { resource: 'admin', action: 'dashboard' }
          },
          {
            href: '/admin/users',
            permission: { resource: 'users', action: 'view' }
          },
          {
            href: '/admin/roles',
            permission: { resource: 'roles', action: 'view' }
          },
          {
            href: '/admin/permissions',
            permission: { resource: 'permissions', action: 'view' }
          },
          {
            href: '/admin/api-keys',
            permission: { resource: 'api-keys', action: 'view' }
          },
          {
            href: '/admin/my-experiences',
            // 个人经验页面不需要特殊权限，只要登录即可访问
            permission: null
          },
          {
            href: '/admin/settings',
            permission: { resource: 'admin', action: 'settings' }
          },
        ];

        // 找到用户有权限的第一个页面
        const firstAccessiblePage = navItems.find(item => {
          // 如果没有权限要求，直接返回true
          if (!item.permission) return true;
          
          // 超级管理员可以看到所有菜单
          if (currentUser?.is_superuser) return true;
          
          // 检查用户是否有对应权限
          return currentUser && hasPermission(currentUser, item.permission.resource, item.permission.action);
        });

        // 跳转到第一个有权限的页面
        // 使用 window.location 确保完全刷新，包括中间件检查
        if (firstAccessiblePage) {
          window.location.href = firstAccessiblePage.href;
        } else {
          // 如果没有任何权限，默认跳转到 user-dashboard
          window.location.href = '/admin/user-dashboard';
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '2rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: 'rgba(0, 0, 0, 0.3) 0px 20px 60px',
          padding: '3rem',
          maxWidth: '450px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            width: '200px',
            height: '200px',
            background: 'linear-gradient(135deg, rgba(67, 97, 238, 0.1), rgba(76, 201, 240, 0.1))',
            borderRadius: '50%',
            transform: 'translate(30%, -30%)',
            zIndex: '0'
          }}></div>
          
          <div style={{ position: 'relative', zIndex: '1' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0px auto 1.5rem',
                background: 'linear-gradient(135deg, rgb(67, 97, 238), rgb(76, 201, 240))',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'rgba(67, 97, 238, 0.3) 0px 8px 24px'
              }}>
                <i className="fas fa-shield-alt" style={{ fontSize: '2rem', color: 'white' }}></i>
              </div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'rgb(30, 41, 59)', marginBottom: '0.5rem' }}>
                管理后台登录
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'rgb(100, 116, 139)' }}>
                请输入您的凭据以访问管理后台
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fee2e2',
                borderColor: '#fecaca',
                marginBottom: '1.5rem',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid'
              }}>
                <div style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'rgb(51, 65, 85)', fontSize: '0.875rem' }}>
                  邮箱或用户名
                </label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-user" style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgb(148, 163, 184)'
                  }}></i>
                  <input
                    required
                    placeholder="邮箱地址或用户名"
                    type="text"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      border: '1px solid rgb(226, 232, 240)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      transition: '0.2s',
                      background: 'rgb(248, 250, 252)',
                      boxShadow: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'rgb(51, 65, 85)', fontSize: '0.875rem' }}>
                  密码
                </label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-lock" style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgb(148, 163, 184)'
                  }}></i>
                  <input
                    required
                    placeholder="••••••••"
                    type="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.75rem',
                      border: '1px solid rgb(226, 232, 240)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      transition: '0.2s',
                      background: 'rgb(248, 250, 252)'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                fontSize: '0.875rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgb(100, 116, 139)', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ cursor: 'pointer' }} />
                  <span>记住我</span>
                </label>
                <a href="#" style={{ color: 'rgb(67, 97, 238)', textDecoration: 'none', fontWeight: '500' }}>
                  忘记密码？
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, rgb(67, 97, 238), rgb(76, 201, 240))',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: '0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: 'rgba(67, 97, 238, 0.3) 0px 4px 12px',
                  transform: 'translateY(0px)',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <i className="fas fa-sign-in-alt"></i>
                <span>{loading ? '登录中...' : '登录'}</span>
              </button>
            </form>

            <div style={{
              textAlign: 'center',
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgb(226, 232, 240)',
              fontSize: '0.875rem',
              color: 'rgb(100, 116, 139)'
            }}>
              需要帮助？请联系系统管理员
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}