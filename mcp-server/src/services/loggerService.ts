import winston from 'winston';

// 日志级别定义
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 日志上下文接口
export interface LogContext {
  sessionId?: string;
  apiKeyId?: string;
  userId?: string;
  method?: string;
  url?: string;
  requestId?: string;
  transportType?: string;
  [key: string]: any;
}

class LoggerService {
  private logger: winston.Logger;

  constructor() {
    // 创建 Winston logger 实例
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || LogLevel.INFO,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          // 格式化输出，包含时间戳、级别、消息和上下文
          const context = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
          return `${timestamp} [${level.toUpperCase()}] ${message} ${context}`;
        })
      ),
      defaultMeta: { 
        service: 'recall-kit-mcp-server',
        version: '1.0.0'
      },
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // 错误日志文件
        new winston.transports.File({
          filename: 'logs/error.log',
          level: LogLevel.ERROR,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        
        // 综合日志文件
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      ],
      
      // 异常处理
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      
      // 拒绝处理
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });

    // 开发环境下添加更详细的格式
    if (process.env.NODE_ENV === 'development') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({
            format: 'HH:mm:ss.SSS'
          }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const context = Object.keys(meta).length > 0 ? 
              `\n  Context: ${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} ${level}: ${message}${context}`;
          })
        )
      }));
    }
  }

  // 连接成功日志
  logConnectionSuccess(context: LogContext) {
    this.logger.info('MCP connection established', {
      event: 'connection_success',
      ...context
    });
  }

  // 连接关闭日志
  logConnectionClose(context: LogContext) {
    this.logger.info('MCP connection closed', {
      event: 'connection_close',
      ...context
    });
  }

  // 工具调用开始日志
  logToolCallStart(toolName: string, args: any, context: LogContext) {
    this.logger.info(`Tool call started: ${toolName}`, {
      event: 'tool_call_start',
      toolName,
      args: this.sanitizeArgs(args),
      ...context
    });
  }

  // 工具调用成功日志
  logToolCallSuccess(toolName: string, result: any, context: LogContext) {
    this.logger.info(`Tool call completed: ${toolName}`, {
      event: 'tool_call_success',
      toolName,
      result: this.sanitizeResult(result),
      ...context
    });
  }

  // 工具调用失败日志
  logToolCallError(toolName: string, error: Error, context: LogContext) {
    this.logger.error(`Tool call failed: ${toolName}`, {
      event: 'tool_call_error',
      toolName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      ...context
    });
  }

  // API 请求日志
  logApiRequest(method: string, url: string, headers: any, context: LogContext) {
    this.logger.info(`API request: ${method} ${url}`, {
      event: 'api_request',
      method,
      url,
      headers: this.sanitizeHeaders(headers),
      ...context
    });
  }

  // API 响应日志
  logApiResponse(method: string, url: string, statusCode: number, responseTime: number, context: LogContext) {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.logger.log(level, `API response: ${method} ${url} - ${statusCode} (${responseTime}ms)`, {
      event: 'api_response',
      method,
      url,
      statusCode,
      responseTime,
      ...context
    });
  }

  // 会话初始化日志
  logSessionInitialized(sessionId: string, transportType: string, context: LogContext) {
    this.logger.info(`Session initialized: ${sessionId}`, {
      event: 'session_initialized',
      sessionId,
      transportType,
      ...context
    });
  }

  // 会话终止日志
  logSessionTerminated(sessionId: string, context: LogContext, reason?: string) {
    this.logger.info(`Session terminated: ${sessionId}`, {
      event: 'session_terminated',
      sessionId,
      reason,
      ...context
    });
  }

  // 数据库操作日志
  logDatabaseOperation(operation: string, table: string, context: LogContext, duration?: number) {
    this.logger.debug(`Database operation: ${operation} on ${table}`, {
      event: 'database_operation',
      operation,
      table,
      duration,
      ...context
    });
  }

  // 服务启动日志
  logServiceStart(port: number, host: string) {
    this.logger.info(`MCP Server starting`, {
      event: 'service_start',
      port,
      host,
      nodeVersion: process.version,
      platform: process.platform
    });
  }

  // 服务启动完成日志
  logServiceReady(port: number, host: string) {
    this.logger.info(`MCP Server ready`, {
      event: 'service_ready',
      port,
      host,
      uptime: process.uptime()
    });
  }

  // 通用日志方法
  error(message: string, context?: LogContext) {
    this.logger.error(message, context);
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(message, context);
  }

  info(message: string, context?: LogContext) {
    this.logger.info(message, context);
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(message, context);
  }

  // 清理敏感信息的辅助方法
  private sanitizeArgs(args: any): any {
    if (!args || typeof args !== 'object') return args;
    
    const sanitized = { ...args };
    
    // 移除或脱敏敏感字段
    if (sanitized.api_key) {
      sanitized.api_key = this.maskApiKey(sanitized.api_key);
    }
    
    if (sanitized.password) {
      sanitized.password = '***';
    }
    
    if (sanitized.token) {
      sanitized.token = '***';
    }
    
    return sanitized;
  }

  private sanitizeResult(result: any): any {
    if (!result || typeof result !== 'object') return result;
    
    // 对于大结果，只记录摘要
    if (result.experiences && Array.isArray(result.experiences)) {
      return {
        ...result,
        experiences: `[Array ${result.experiences.length} items]`,
        total_count: result.total_count
      };
    }
    
    return result;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') return headers;
    
    const sanitized = { ...headers };
    
    // 脱敏敏感头部
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***';
      }
    }
    
    return sanitized;
  }

  private maskApiKey(apiKey: string): string {
    if (!apiKey || typeof apiKey !== 'string') return apiKey;
    if (apiKey.length <= 8) return '***';
    return apiKey.substring(0, 8) + '***';
  }

  // 获取 logger 实例（用于特殊情况）
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// 创建单例实例
export const logger = new LoggerService();
