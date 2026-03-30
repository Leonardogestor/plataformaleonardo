export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, any>
  timestamp: Date
  userId?: string
  requestId?: string
}

class Logger {
  private context: Record<string, any> = {}

  constructor(private service: string) {}

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      level,
      message,
      context: { ...this.context, ...context },
      timestamp: new Date(),
      requestId: this.context.requestId,
      userId: this.context.userId
    }

    // Em produção, usar serviço de logging real
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar com Datadog, Sentry, etc.
      console.log(JSON.stringify(logEntry))
    } else {
      // Desenvolvimento: formato legível
      const timestamp = logEntry.timestamp.toISOString()
      const contextStr = Object.keys(logEntry.context || {}).length > 0 
        ? ` | ${JSON.stringify(logEntry.context)}` 
        : ''
      
      console.log(`[${timestamp}] ${level} [${this.service}] ${message}${contextStr}`)
    }
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  // Métodos específicos para o pipeline
  transactionProcessed(userId: string, count: number, source: string): void {
    this.setContext({ userId })
    this.info(`Transactions processed successfully`, {
      event: 'transaction_processed',
      count,
      source,
      userId
    })
  }

  transactionFailed(userId: string, error: string, source: string): void {
    this.setContext({ userId })
    this.error(`Transaction processing failed`, {
      event: 'transaction_failed',
      error,
      source,
      userId
    })
  }

  duplicateDetected(userId: string, fingerprint: string): void {
    this.setContext({ userId })
    this.warn(`Duplicate transaction detected and ignored`, {
      event: 'duplicate_detected',
      fingerprint,
      userId
    })
  }

  pipelineStarted(userId: string, fileName: string, fileId: string): void {
    this.setContext({ userId })
    this.info(`Pipeline processing started`, {
      event: 'pipeline_started',
      fileName,
      fileId,
      userId
    })
  }

  pipelineCompleted(userId: string, processed: number, duration: number): void {
    this.setContext({ userId })
    this.info(`Pipeline processing completed`, {
      event: 'pipeline_completed',
      processed,
      duration,
      userId
    })
  }

  retryAttempt(operation: string, attempt: number, error: string): void {
    this.warn(`Retry attempt for ${operation}`, {
      event: 'retry_attempt',
      operation,
      attempt,
      error,
      maxRetries: 3
    })
  }

  merchantMappingCreated(userId: string, rawDescription: string, merchant: string): void {
    this.setContext({ userId })
    this.info(`New merchant mapping created`, {
      event: 'merchant_mapping_created',
      rawDescription,
      merchant,
      userId
    })
  }
}

// Singleton instances para diferentes serviços
export const pipelineLogger = new Logger('PIPELINE')
export const queueLogger = new Logger('QUEUE')
export const apiLogger = new Logger('API')
export const dbLogger = new Logger('DATABASE')

export default Logger
