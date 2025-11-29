// 认证相关的数据库类型定义

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  is_superuser: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string | null;  // 权限代码（function类型必填，如："users.view"）
  type: 'module' | 'page' | 'function';  // 权限类型
  parent_id: string | null;  // 父权限ID，NULL表示根节点
  page_path: string | null;  // 页面路径（page类型必填，如："/admin/users"）
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}