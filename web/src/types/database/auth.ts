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

export interface ApiKeyUsageLog {
  id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  created_at: string;
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
  resource: string;
  action: string;
  description: string | null;
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