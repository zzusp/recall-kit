/**
 * 统一的权限提示服务
 * 专门处理权限相关的提示信息
 */

import { useToastStore } from './toast';
import { getErrorMessage } from '@/config/errorMessages';

export interface PermissionToastOptions {
  duration?: number;
  persistent?: boolean;
  customMessage?: string;
}

/**
 * 权限提示服务
 * 提供统一的权限提示接口
 */
export const permissionToast = {
  /**
   * 显示未授权提示
   */
  unauthorized(options?: PermissionToastOptions) {
    const { duration = 3000, persistent = false, customMessage } = options || {};
    
    const message = customMessage || getErrorMessage.unauthorized().message;
    const title = getErrorMessage.unauthorized().title;

    // 使用自定义的权限提示类型
    useToastStore.getState().addToast({
      id: 'permission-' + Date.now(),
      type: 'warning', // 这里用 warning，但在 PermissionToast 组件中会根据 type 转换
      title,
      message,
      duration: persistent ? 0 : duration,
      persistent,
    });
  },

  /**
   * 显示权限不足提示
   */
  forbidden(options?: { type?: keyof typeof ErrorMessages.FORBIDDEN | string } & PermissionToastOptions) {
    const { type, duration = 5000, persistent = false, customMessage } = options || {};
    
    const errorInfo = getErrorMessage.forbidden(type);
    const message = customMessage || errorInfo.message;
    const title = errorInfo.title;

    // 使用自定义的权限提示类型
    useToastStore.getState().addToast({
      id: 'permission-' + Date.now(),
      type: 'error', // 这里用 error，但在 PermissionToast 组件中会根据 type 转换
      title,
      message,
      duration: persistent ? 0 : duration,
      persistent,
    });
  },

  /**
   * 显示需要特定权限的提示
   */
  needPermission(permission: string, options?: Omit<PermissionToastOptions, 'customMessage'>) {
    this.forbidden({
      type: 'needPermission' as any,
      customMessage: getErrorMessage.forbidden('needPermission' as any).message.replace('UNKNOWN_PERMISSION', permission),
      ...options,
    });
  },

  /**
   * 显示需要多个权限的提示
   */
  needPermissions(permissions: string[], options?: Omit<PermissionToastOptions, 'customMessage'>) {
    this.forbidden({
      type: 'needPermissions' as any,
      customMessage: getErrorMessage.forbidden('needPermissions' as any).message.replace(/PERMISSION_\d/g, permissions[0] || 'UNKNOWN'),
      ...options,
    });
  },

  /**
   * 显示需要管理员权限的提示
   */
  needAdmin(options?: Omit<PermissionToastOptions, 'customMessage'>) {
    this.forbidden({
      type: 'needAdmin' as any,
      ...options,
    });
  },

  /**
   * 显示需要超级用户权限的提示
   */
  needSuperuser(options?: Omit<PermissionToastOptions, 'customMessage'>) {
    this.forbidden({
      type: 'needSuperuser' as any,
      ...options,
    });
  },

  /**
   * 显示无法访问页面的提示
   */
  cannotAccessPage(pagePath: string, options?: Omit<PermissionToastOptions, 'customMessage'>) {
    this.forbidden({
      type: 'cannotAccessPage' as any,
      customMessage: getErrorMessage.forbidden('cannotAccessPage' as any).message.replace('/unknown', pagePath),
      ...options,
    });
  },

  /**
   * 显示登录过期的提示
   */
  sessionExpired(options?: Omit<PermissionToastOptions, 'customMessage'>) {
    this.unauthorized({
      customMessage: getErrorMessage.unauthorized('sessionExpired').message,
      ...options,
    });
  },

  /**
   * 显示需要登录的提示
   */
  needLogin(options?: Omit<PermissionToastOptions, 'customMessage'>) {
    this.unauthorized({
      customMessage: getErrorMessage.unauthorized('needLogin').message,
      ...options,
    });
  },
};

/**
 * 权限提示Hook
 * 提供React组件中使用权限提示的便捷方法
 */
export const usePermissionToast = () => {
  return permissionToast;
};
