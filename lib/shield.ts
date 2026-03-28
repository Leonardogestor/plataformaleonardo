/**
 * BLINDAGEM - Sistema Central de Proteção
 * Exportação unificada de todas as funcionalidades de blindagem
 */

// Validação de dados
export * from "./validation"

// Tratamento de erros
export * from "./error-handler"

// Type guards e validação de tipos - evitando conflitos
export {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isDate,
  isNull,
  isUndefined,
  isNullOrUndefined,
  isValidUser,
  isValidAccount,
  isValidTransaction,
  isValidFinancialData,
  safeString,
  safeNumber,
  safeBoolean,
  safeArray,
  safeObject,
  safeDate,
  safeGet,
  isEmpty,
  isValidArrayOf,
  isValidEmail,
  isValidId,
  isValidHttpStatus,
  isValidApiResponse,
  isValidUrlParams,
  isValidConfig,
  validateType,
  validateMultiple,
} from "./type-guards"

// Sistema de permissões
export * from "./permissions"

// Cache e memoização
export * from "./cache"

// Validação de sessão
export * from "./session-validation"

// Funções de segurança adicionais
export class SecurityShield {
  // Sanitização de entrada de dados
  static sanitizeInput(input: any): any {
    if (typeof input === "string") {
      return input
        .trim()
        .replace(/[<>]/g, "") // Remove tags HTML
        .replace(/javascript:/gi, "") // Remove javascript:
        .replace(/on\w+=/gi, "") // Remove event handlers
        .substring(0, 1000) // Limita tamanho
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item))
    }

    if (typeof input === "object" && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value)
      }
      return sanitized
    }

    return input
  }

  // Validação de força de senha
  static validatePasswordStrength(password: string): {
    isValid: boolean
    score: number
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    // Comprimento mínimo
    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push("Senha deve ter pelo menos 8 caracteres")
    }

    // Letras maiúsculas
    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push("Adicione letras maiúsculas")
    }

    // Letras minúsculas
    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push("Adicione letras minúsculas")
    }

    // Números
    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push("Adicione números")
    }

    // Caracteres especiais
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push("Adicione caracteres especiais")
    }

    // Não conter informações pessoais
    const commonPatterns = ["123456", "password", "qwerty", "admin", "user"]
    if (commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))) {
      score -= 2
      feedback.push("Evite padrões comuns de senha")
    }

    return {
      isValid: score >= 3,
      score: Math.max(0, Math.min(5, score)),
      feedback,
    }
  }

  // Rate limiting simples
  private static attempts = new Map<string, { count: number; lastAttempt: number }>()

  static checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 60000): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(identifier)

    if (!attempts) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now })
      return true
    }

    // Reset se a janela de tempo passou
    if (now - attempts.lastAttempt > windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now })
      return true
    }

    // Incrementar tentativas
    attempts.count++
    attempts.lastAttempt = now

    // Verificar se excedeu o limite
    if (attempts.count > maxAttempts) {
      return false
    }

    return true
  }

  // Validação de CORS
  static validateOrigin(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.includes(origin) || allowedOrigins.includes("*")
  }

  // Detecção de bots simples
  static isBot(userAgent: string): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /node/i,
    ]

    return botPatterns.some((pattern) => pattern.test(userAgent))
  }

  // Validação de tamanho de arquivo
  static validateFileSize(size: number, maxSize: number): boolean {
    return size > 0 && size <= maxSize
  }

  // Validação de tipo de arquivo
  static validateFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.split(".").pop()?.toLowerCase()
    return extension ? allowedTypes.includes(extension) : false
  }

  // Geração de token seguro
  static generateSecureToken(length = 32): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return result
  }

  // Hash simples (para desenvolvimento apenas)
  static simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  // Validação de integridade de dados
  static validateIntegrity(data: any, expectedHash?: string): boolean {
    if (!expectedHash) return true

    const dataString = JSON.stringify(data)
    const calculatedHash = this.simpleHash(dataString)

    return calculatedHash === expectedHash
  }

  // Limpeza de dados sensíveis
  static sanitizeForLogging(data: any): any {
    if (typeof data === "string") {
      return data.length > 100 ? data.substring(0, 100) + "..." : data
    }

    if (Array.isArray(data)) {
      return data.slice(0, 5) // Limitar arrays
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: any = {}
      let count = 0

      for (const [key, value] of Object.entries(data)) {
        if (count >= 10) break // Limitar número de propriedades

        // Remover campos sensíveis
        if (
          ["password", "token", "secret", "key"].some((sensitive) =>
            key.toLowerCase().includes(sensitive)
          )
        ) {
          sanitized[key] = "[REDACTED]"
        } else {
          sanitized[key] = this.sanitizeForLogging(value)
        }

        count++
      }

      return sanitized
    }

    return data
  }

  // Verificação de saúde do sistema
  static healthCheck(): {
    status: "healthy" | "degraded" | "unhealthy"
    checks: Record<string, boolean>
    timestamp: string
  } {
    const checks: Record<string, boolean> = {
      memory: this.checkMemoryUsage(),
      storage: this.checkStorageAvailability(),
      performance: this.checkPerformance(),
      security: this.checkSecuritySettings(),
    }

    const healthyCount = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.keys(checks).length

    let status: "healthy" | "degraded" | "unhealthy"
    if (healthyCount === totalChecks) {
      status = "healthy"
    } else if (healthyCount >= totalChecks / 2) {
      status = "degraded"
    } else {
      status = "unhealthy"
    }

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    }
  }

  private static checkMemoryUsage(): boolean {
    if (typeof window !== "undefined" && "performance" in window) {
      const memory = (performance as any).memory
      if (memory) {
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit
        return usage < 0.9 // Menos de 90% de uso
      }
    }
    return true
  }

  private static checkStorageAvailability(): boolean {
    if (typeof window !== "undefined" && "localStorage" in window) {
      try {
        const test = "test"
        localStorage.setItem(test, test)
        localStorage.removeItem(test)
        return true
      } catch {
        return false
      }
    }
    return true
  }

  private static checkPerformance(): boolean {
    if (typeof window !== "undefined" && "performance" in window) {
      const navigation = performance.getEntriesByType("navigation")[0] as any
      if (navigation) {
        return navigation.loadEventEnd - navigation.loadEventStart < 3000 // Carregamento em menos de 3s
      }
    }
    return true
  }

  private static checkSecuritySettings(): boolean {
    // Verificar se HTTPS está sendo usado
    if (typeof window !== "undefined") {
      return window.location.protocol === "https:" || window.location.hostname === "localhost"
    }
    return true
  }
}

// Não precisa exportar novamente, já foi exportado acima
