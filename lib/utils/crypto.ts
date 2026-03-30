import crypto from 'crypto'

/**
 * Gera hash SHA-256 para idempotência de arquivos
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Gera fingerprint único para transação (deduplicação)
 */
export function generateTransactionFingerprint(transaction: {
  date: Date
  amount: number
  description: string
}): string {
  const dateStr = transaction.date.toISOString().split('T')[0] // YYYY-MM-DD
  const amountStr = transaction.amount.toFixed(2) // 2 casas decimais
  const descriptionStr = transaction.description.toLowerCase().trim()
  
  return `${dateStr}-${amountStr}-${descriptionStr}`
}

/**
 * Gera ID único para processamento assíncrono
 */
export function generateProcessingId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calcula delay exponencial com backoff para retry
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000) // Máximo 30 segundos
}

/**
 * Verifica se erro é recuperável (deve fazer retry)
 */
export function isRecoverableError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || error.toString()
  
  // Erros recuperáveis comuns
  const recoverablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /temporary/i,
    /rate limit/i,
    /502/i,
    /503/i,
    /504/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i
  ]
  
  return recoverablePatterns.some(pattern => pattern.test(errorMessage))
}

/**
 * Extrai chave para busca de merchant mapping
 */
export function extractMerchantKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
    .split(' ')
    .slice(0, 3) // Primeiras 3 palavras
    .join('_')
}
