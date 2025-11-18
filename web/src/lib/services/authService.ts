import { db } from '../db/client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/**
 * 检查用户是否已登录
 */
export async function isAuthenticated(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false; // Server-side, cannot access localStorage
  }
  
  const sessionToken = localStorage.getItem('session_token');
  if (!sessionToken) {
    return false;
  }

  try {
    const result = await db.query(
      'SELECT user_id FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * 获取当前用户会话
 */
export async function getCurrentSession() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const sessionToken = localStorage.getItem('session_token');
  if (!sessionToken) {
    return null;
  }

  try {
    const result = await db.query(
      'SELECT user_id, expires_at FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    
    return result.rows.length > 0 ? {
      user: { id: result.rows[0].user_id },
      expires_at: result.rows[0].expires_at
    } : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }
  
  try {
    const result = await db.query(
      'SELECT id, username, email FROM users WHERE id = $1 AND is_active = true',
      [session.user.id]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * 获取当前用户资料（包含角色信息）
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  try {
    const result = await db.query(`
      SELECT u.id, u.username, u.email, u.created_at, u.updated_at, u.last_login_at,
             CASE WHEN r.name = 'admin' THEN 'admin' ELSE 'user' END as role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
    `, [user.id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * 检查用户是否为管理员
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === 'admin';
}

/**
 * 登录
 */
export async function signIn(username: string, password: string) {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      throw new Error('用户名或密码错误');
    }

    const user = result.rows[0];

    // TODO: Implement proper password verification
    // For now, just compare the hash (you should use bcrypt)
    if (user.password_hash !== password) {
      throw new Error('用户名或密码错误');
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.query(
      'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, sessionToken, expiresAt.toISOString()]
    );

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [new Date().toISOString(), user.id]
    );

    // Store session token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('session_token', sessionToken);
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      session: {
        access_token: sessionToken,
        expires_at: expiresAt.toISOString()
      }
    };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * 登出
 */
export async function signOut() {
  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
      try {
        await db.query(
          'DELETE FROM user_sessions WHERE session_token = $1',
          [sessionToken]
        );
      } catch (error) {
        console.error('Error removing session:', error);
      }
      localStorage.removeItem('session_token');
    }
  }
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(callback: (session: any) => void) {
  // For PostgreSQL, we don't have real-time subscriptions like Supabase
  // This is a simplified implementation that checks localStorage changes
  if (typeof window !== 'undefined') {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session_token') {
        getCurrentSession().then(callback);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Initial check
    getCurrentSession().then(callback);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  return () => {};
}

/**
 * 更新最后登录时间
 */
export async function updateLastLoginTime(userId: string) {
  try {
    await db.query(
      'UPDATE users SET last_login_at = $1 WHERE id = $2',
      [new Date().toISOString(), userId]
    );
  } catch (error) {
    console.error('Error updating last login time:', error);
  }
}

// Helper function
function generateSessionToken(): string {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
}