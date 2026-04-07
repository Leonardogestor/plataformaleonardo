/**
 * Logger profissional para produção
 * Remove console.log e implementa logging controlado
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  userId?: string
  requestId?: string
  metadata?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class ProductionLogger {
  private isProduction = process.env.NODE_ENV === 'production'
  private logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'warn' : 'debug')
  
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]
    const currentLevelIndex = levels.indexOf(this.logLevel as LogLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex <= currentLevelIndex
  }

  private sanitize(data: any): any {
    if (!data) return data
    
    const sensitive = ['password', 'token', 'secret', 'key', 'authorization', 'credential']
    const sanitized = Array.isArray(data) ? [...data] : { ...data }
    
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.map(sanitizeValue)
        }
        
        const result: any = {}
        for (const [key, val] of Object.entries(value)) {
          if (sensitive.some(s => key.toLowerCase().includes(s))) {
            result[key] = '[REDACTED]'
          } else {
            result[key] = sanitizeValue(val)
          }
        }
        return result
      }
      return value
    }
    
    return sanitizeValue(sanitized)
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message: this.sanitize(message),
      timestamp: new Date().toISOString(),
      context,
      metadata: metadata ? this.sanitize(metadata) : undefined
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: this.sanitize(error.message),
        stack: this.isProduction ? undefined : error.stack
      }
    }

    return entry
  }

  private writeLog(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return

    const logString = JSON.stringify(entry)
    
    // Em produção, usar apenas console.error e console.warn
    if (this.isProduction) {
      if (entry.level === LogLevel.ERROR) {
        console.error(logString)
      } else if (entry.level === LogLevel.WARN) {
        console.warn(logString)
      }
      // INFO e DEBUG são ignorados em produção
    } else {
      // Em desenvolvimento, usar todos os níveis
      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(`❌ ${entry.message}`, entry.metadata, entry.error)
          break
        case LogLevel.WARN:
          console.warn(`⚠️ ${entry.message}`, entry.metadata)
          break
        case LogLevel.INFO:
          console.log(`ℹ️ ${entry.message}`, entry.metadata)
          break
        case LogLevel.DEBUG:
          console.debug(`🐛 ${entry.message}`, entry.metadata)
          break
      }
    }
  }

  error(message: string, context?: string, metadata?: Record<string, any>, error?: Error) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata, error)
    this.writeLog(entry)
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata)
    this.writeLog(entry)
  }

  info(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata)
    this.writeLog(entry)
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata)
    this.writeLog(entry)
  }

  // Métodos específicos para contexto
  auth(action: string, userId?: string, metadata?: Record<string, any>) {
    this.info(`Auth: ${action}`, 'auth', { userId, ...metadata })
  }

  api(method: string, endpoint: string, status: number, duration: number, userId?: string) {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.INFO
    this.createLogEntry(level, `API: ${method} ${endpoint}`, 'api', {
      status,
      duration: `${duration}ms`,
      userId
    })
    this.writeLog(this.createLogEntry(level, `API: ${method} ${endpoint}`, 'api', {
      status,
      duration: `${duration}ms`,
      userId
    }))
  }

  pdf(operation: string, documentId: string, userId?: string, metadata?: Record<string, any>) {
    this.info(`PDF: ${operation}`, 'pdf', { documentId, userId, ...metadata })
  }

  database(operation: string, table: string, duration?: number, error?: Error) {
    if (error) {
      this.error(`DB Error: ${operation} on ${table}`, 'database', { table, duration }, error)
    } else {
      this.debug(`DB: ${operation} on ${table}`, 'database', { table, duration })
    }
  }

  rateLimit(action: string, identifier: string, limit: number, remaining: number) {
    this.warn(`Rate Limit: ${action}`, 'rate-limit', { identifier, limit, remaining })
  }
}

// Singleton global
export const logger = new ProductionLogger()

// Middleware para request logging
export function createRequestLogger(request: Request) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  return {
    requestId,
    logStart: (method: string, pathname: string) => {
      logger.debug(`Request started: ${method} ${pathname}`, 'request', { requestId })
    },
    logEnd: (method: string, pathname: string, status: number) => {
      const duration = Date.now() - startTime
      logger.api(method, pathname, status, duration)
    },
    logError: (method: string, pathname: string, error: Error) => {
      const duration = Date.now() - startTime
      logger.error(`Request failed: ${method} ${pathname}`, 'request', { 
        requestId, 
        duration: `${duration}ms` 
      }, error)
    }
  }
}

// Substituir console.log global em produção
if (process.env.NODE_ENV === 'production') {
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
  console.warn = logger.warn.bind(logger)
  console.error = logger.error.bind(logger)
}

export default logger
