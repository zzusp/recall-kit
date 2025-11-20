// 数据库配置

export const databaseConfig = {
  // 连接配置
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  name: process.env.DATABASE_NAME || 'recall_kit',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: process.env.DATABASE_SSL === 'true',
  
  // 连接池配置
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // 查询配置
  queryTimeout: 30000,
  statementTimeout: 10000,
  
  // 开发环境配置
  development: {
    logging: process.env.NODE_ENV !== 'production',
    benchmark: process.env.NODE_ENV !== 'production',
  },
};

export default databaseConfig;