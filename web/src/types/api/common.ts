// API相关的通用类型定义

export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

export type ApiResult<T = any> = ApiResponse<T> | ApiError;

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: PaginationMeta;
}> {}

export interface SortParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RequestOptions extends PaginationParams, SortParams, FilterParams {
  include?: string[];
  exclude?: string[];
}