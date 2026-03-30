import { calculateBackoffDelay, isRecoverableError } from "./crypto"
import { pipelineLogger } from "./logger"

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  onRetry?: (attempt: number, error: any) => void
}

/**
 * Função genérica de retry com backoff exponencial
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, baseDelay)
        pipelineLogger.retryAttempt("operation", attempt, lastError?.message)

        // Espera exponencial
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      return await operation()
    } catch (error: any) {
      lastError = error

      // Se não for erro recuperável ou última tentativa, lançar erro
      if (!isRecoverableError(error) || attempt === maxRetries) {
        pipelineLogger.error("Operation failed after all retries", {
          attempts: attempt + 1,
          errors: [error.message],
          recoverable: isRecoverableError(error),
        })
        throw error
      }

      // Callback de retry para logging/monitoramento
      if (onRetry) {
        onRetry(attempt + 1, error)
      }
    }
  }

  // Nunca deve chegar aqui, mas por segurança
  throw lastError
}

/**
 * Retry com jitter para evitar thundering herd
 */
export async function retryWithJitter<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Adiciona jitter aleatório (±25%)
        const calculatedDelay = calculateBackoffDelay(attempt - 1, baseDelay)
        const jitter = calculatedDelay * 0.25 * (Math.random() * 2 - 1)
        const finalDelay = Math.max(100, calculatedDelay + jitter)

        pipelineLogger.retryAttempt("operation_with_jitter", attempt, lastError?.message)
        await new Promise((resolve) => setTimeout(resolve, finalDelay))
      }

      return await operation()
    } catch (error: any) {
      lastError = error

      if (!isRecoverableError(error) || attempt === maxRetries) {
        throw error
      }
    }
  }

  throw lastError
}

/**
 * Circuit breaker pattern para evitar cascata de falhas
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED"

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minuto
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Se circuito está aberto e não expirou, falha rápido
    if (this.state === "OPEN" && Date.now() - this.lastFailureTime < this.timeout) {
      throw new Error("Circuit breaker is OPEN")
    }

    // Se está half-open, tenta uma vez
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN"
    }

    try {
      const result = await operation()

      // Sucesso: reseta falhas e fecha circuito
      this.failures = 0
      this.state = "CLOSED"

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      // Abre circuito se atingir threshold
      if (this.failures >= this.threshold) {
        this.state = "OPEN"
        pipelineLogger.warn("Circuit breaker opened", {
          failures: this.failures,
          threshold: this.threshold,
        })
      }

      throw error
    }
  }

  getState(): string {
    return this.state
  }

  reset(): void {
    this.failures = 0
    this.state = "CLOSED"
    this.lastFailureTime = 0
  }
}
