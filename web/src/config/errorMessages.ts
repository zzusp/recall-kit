/**
 * 统一的错误消息配置
 * 用于标准化项目中的所有错误提示信息
 */

export const ErrorMessages = {
  // 认证相关
  UNAUTHORIZED: {
    title: '需要登录',
    message: '请先登录后访问此功能',
    apiMessage: '未授权访问',
    sessionExpired: '登录已过期，请重新登录',
    credentialsInvalid: '用户名或密码错误',
    loginFailed: '登录失败，请重试',
    needLogin: '请先登录',
  },
  
  // 权限相关
  FORBIDDEN: {
    title: '权限不足',
    message: '您没有权限访问此功能',
    apiMessage: '权限不足',
    needPermission: (permission: string) => `权限不足：需要权限 ${permission}`,
    needPermissions: (permissions: string[]) => `权限不足：需要以下任一权限 ${permissions.join(', ')}`,
    needAdmin: '权限不足：需要管理员权限',
    needSuperuser: '权限不足：需要超级用户权限',
    cannotAccessPage: (pagePath: string) => `权限不足：无法访问页面 ${pagePath}`,
  },
  
  // 资源相关
  NOT_FOUND: {
    title: '资源未找到',
    message: '请求的资源不存在',
    apiMessage: '资源未找到',
  },
  
  // 请求相关
  BAD_REQUEST: {
    title: '请求错误',
    message: '请求参数有误',
    apiMessage: '请求参数错误',
    missingParameter: '缺少必填参数',
    invalidParameter: '参数格式不正确',
    validationFailed: '数据验证失败',
  },
  
  // 冲突相关
  CONFLICT: {
    title: '资源冲突',
    message: '操作冲突，请刷新后重试',
    apiMessage: '资源冲突',
    resourceExists: '资源已存在',
    duplicateKey: '数据重复，唯一性约束冲突',
  },
  
  // 系统相关
  INTERNAL_ERROR: {
    title: '系统错误',
    message: '系统内部错误，请稍后重试',
    apiMessage: '服务器内部错误',
    databaseError: '数据库操作失败',
    externalServiceError: '外部服务调用失败',
  },
  
  // 操作相关
  OPERATION_NOT_ALLOWED: {
    title: '操作不允许',
    message: '当前状态下不允许执行此操作',
    apiMessage: '操作不被允许',
  },
  
  // 业务相关
  INSUFFICIENT_PERMISSIONS: {
    title: '权限不足',
    message: '您的权限不足以执行此操作',
    apiMessage: '权限不足',
  },
  
  // 通用消息
  COMMON: {
    loading: '正在加载...',
    verifying: '验证权限中...',
    operationSuccess: '操作成功',
    operationFailed: '操作失败',
    requestFailed: (status: number) => `请求失败 (${status})`,
    networkError: '网络连接失败，请检查网络设置',
    timeout: '请求超时，请重试',
  },
  
  // 文件上传相关
  UPLOAD: {
    sizeExceeded: '文件大小超出限制',
    typeNotSupported: '不支持的文件类型',
    uploadFailed: '文件上传失败',
  },
  
  // 表单相关
  FORM: {
    required: '此字段为必填项',
    invalidEmail: '请输入有效的邮箱地址',
    invalidPhone: '请输入有效的手机号码',
    passwordTooWeak: '密码强度不足',
    passwordsNotMatch: '两次输入的密码不一致',
  },
} as const;

/**
 * 获取错误消息的辅助函数
 */
export const getErrorMessage = {
  // 获取未授权消息
  unauthorized: (type?: keyof typeof ErrorMessages.UNAUTHORIZED): { title: string; message: string } => {
    const errorType = type || 'message';
    return {
      title: ErrorMessages.UNAUTHORIZED.title,
      message: ErrorMessages.UNAUTHORIZED[errorType] as string,
    };
  },
  
  // 获取权限不足消息
  forbidden: (type?: keyof typeof ErrorMessages.FORBIDDEN | string): { title: string; message: string } => {
    if (typeof type === 'string' && !Object.keys(ErrorMessages.FORBIDDEN).includes(type)) {
      return {
        title: ErrorMessages.FORBIDDEN.title,
        message: type as string,
      };
    }
    
    const errorType = (type || 'message') as keyof typeof ErrorMessages.FORBIDDEN;
    let message = ErrorMessages.FORBIDDEN[errorType] as string;
    
    // 处理动态消息
    if (errorType === 'needPermission' && typeof message === 'function') {
      message = message('UNKNOWN_PERMISSION');
    } else if (errorType === 'needPermissions' && typeof message === 'function') {
      message = message(['PERMISSION_1', 'PERMISSION_2']);
    } else if (errorType === 'cannotAccessPage' && typeof message === 'function') {
      message = message('/unknown');
    }
    
    return {
      title: ErrorMessages.FORBIDDEN.title,
      message,
    };
  },
  
  // 获取通用错误消息
  common: (type?: keyof typeof ErrorMessages.COMMON | string): { title: string; message: string } => {
    if (typeof type === 'string' && !Object.keys(ErrorMessages.COMMON).includes(type)) {
      return {
        title: '错误',
        message: type as string,
      };
    }
    
    const errorType = (type || 'operationFailed') as keyof typeof ErrorMessages.COMMON;
    let message = ErrorMessages.COMMON[errorType] as string;
    
    // 处理动态消息
    if (errorType === 'requestFailed' && typeof message === 'function') {
      message = message(500);
    }
    
    return {
      title: '错误',
      message,
    };
  },
  
  // 获取特定类型的错误消息
  getByType: <T extends keyof typeof ErrorMessages>(
    type: T,
    subType?: keyof typeof ErrorMessages[T] | string
  ): { title: string; message: string } => {
    const errorCategory = ErrorMessages[type];
    
    if (!errorCategory) {
      return getErrorMessage.common('未知错误类型');
    }
    
    if (!subType) {
      return {
        title: (errorCategory as any).title || '错误',
        message: (errorCategory as any).message || (errorCategory as any).apiMessage || '发生错误',
      };
    }
    
    if (typeof subType === 'string' && !Object.keys(errorCategory).includes(subType)) {
      return {
        title: (errorCategory as any).title || '错误',
        message: subType,
      };
    }
    
    let message = (errorCategory as any)[subType];
    
    // 处理动态消息函数
    if (typeof message === 'function') {
      if (type === 'FORBIDDEN' && subType === 'needPermission') {
        message = message('UNKNOWN_PERMISSION');
      } else if (type === 'FORBIDDEN' && subType === 'needPermissions') {
        message = message(['PERMISSION_1', 'PERMISSION_2']);
      } else if (type === 'FORBIDDEN' && subType === 'cannotAccessPage') {
        message = message('/unknown');
      } else if (type === 'COMMON' && subType === 'requestFailed') {
        message = message(500);
      } else {
        message = '动态消息参数不完整';
      }
    }
    
    return {
      title: (errorCategory as any).title || '错误',
      message: message || '发生错误',
    };
  },
};

export default ErrorMessages;