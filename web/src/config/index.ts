// 配置文件统一入口

export { default as databaseConfig } from './database';
export { default as authConfig } from './auth';
export { default as apiConfig } from './api';
export { default as environmentConfig, validateEnvironment } from './environment';

// 重新导出所有配置
import databaseConfig from './database';
import authConfig from './auth';
import apiConfig from './api';
import environmentConfig from './environment';

// 统一配置对象
export const config = {
  database: databaseConfig,
  auth: authConfig,
  api: apiConfig,
  environment: environmentConfig,
};

export default config;