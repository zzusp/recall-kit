'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // 如果 session 还在加载中，等待
    if (status === 'loading') {
      return;
    }

    // 如果没有 session，重定向到登录页
    if (status === 'unauthenticated' || !session) {
      router.push('/admin/login');
      return;
    }

    const loadUserProfile = async () => {
      try {
        const currentUser = session.user as any;
        setUser(currentUser);
        
        // 设置用户基本信息 - 只设置存在的字段
        setProfileData(prev => ({
          ...prev,
          username: currentUser.username || '',
          email: currentUser.email || '',
        }));

      } catch (err) {
        setError('加载用户信息失败');
      }
    };

    loadUserProfile();
  }, [router, session, status]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/profile-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存个人设置失败');
      }

      setSuccess('个人设置已成功保存');
      
      // 更新本地用户信息
      const updatedUser = await getCurrentUser();
      if (updatedUser) {
        setUser(updatedUser);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '保存个人设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('新密码长度至少为6位');
      return;
    }

    setIsPasswordLoading(true);

    try {
      const response = await fetch('/api/admin/profile-settings/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '修改密码失败');
      }

      setSuccess('密码修改成功');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">个人信息</h1>
          <p className="admin-page-subtitle">管理您的个人信息和偏好设置</p>
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

      {success && (
        <div className="admin-card" style={{ background: '#d1fae5', borderColor: '#a7f3d0' }}>
          <div style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* 基本信息 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <i className="fas fa-user" style={{ marginRight: '0.5rem', color: '#4361ee' }}></i>
              基本信息
            </h2>
          </div>

          <form onSubmit={handleProfileSave}>
            <div className="admin-form-group">
              <label className="admin-form-label">
                <i className="fas fa-id-badge" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                用户名
              </label>
              <input
                type="text"
                className="admin-form-input"
                value={profileData.username}
                disabled
                style={{ background: '#f8fafc', cursor: 'not-allowed' }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '0.25rem' }}></i>
                用户名是您在系统中的唯一标识，如需修改请联系管理员
              </p>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                <i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
                邮箱地址
              </label>
              <input
                type="email"
                className="admin-form-input"
                value={profileData.email}
                disabled
                style={{ background: '#f8fafc', cursor: 'not-allowed' }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '0.25rem' }}></i>
                邮箱地址用于登录验证，如需修改请联系管理员
              </p>
            </div>

            <div style={{ 
              textAlign: 'center', 
              padding: '1.5rem', 
              background: '#f8fafc', 
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
              marginTop: '1.5rem'
            }}>
              <i className="fas fa-info-circle" style={{ 
                fontSize: '2rem', 
                marginBottom: '1rem', 
                color: '#4361ee' 
              }}></i>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                基本信息为账户核心标识，如需修改请联系系统管理员
              </p>
            </div>
          </form>
        </div>
        </div>

        {/* 通知设置 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <i className="fas fa-bell" style={{ marginRight: '0.5rem', color: '#f39c12' }}></i>
              通知设置
            </h2>
          </div>

          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <i className="fas fa-bell" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f39c12' }}></i>
            <p>通知设置功能暂时不可用</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              需要数据库支持相关字段后才能使用
            </p>
          </div>
        </div>

      {/* 修改密码 */}
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <i className="fas fa-lock" style={{ marginRight: '0.5rem', color: '#e74c3c' }}></i>
            修改密码
          </h2>
        </div>

        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <i className="fas fa-lock" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#e74c3c' }}></i>
          <p>密码修改功能暂时不可用</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            需要系统支持密码管理功能后才能使用
          </p>
        </div>
      </div>

      {/* 账户信息 */}
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <i className="fas fa-info-circle" style={{ marginRight: '0.5rem', color: '#64748b' }}></i>
            账户信息
          </h2>
        </div>
        
        {user && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                用户ID
              </div>
              <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 500 }}>
                {user.id}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                注册时间
              </div>
              <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 500 }}>
                {user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '未知'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                最后登录
              </div>
              <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 500 }}>
                {user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '未知'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                账户状态
              </div>
              <div style={{ fontSize: '1rem', color: '#2ecc71', fontWeight: 500 }}>
                <i className="fas fa-check-circle" style={{ marginRight: '0.25rem' }}></i>
                正常
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}