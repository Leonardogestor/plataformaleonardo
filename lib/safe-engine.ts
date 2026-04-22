

export type TransactionType = "INCOME" | "EXPENSE" | "INVESTIMENTO"

export interface SafeTransaction {
  date: string
  type: TransactionType
  category: string
  value: number
  description: string
  confidence: number
  source: "parser" | "fallback" | "corrected"
  reviewRequired: boolean
}

export interface FailureLog {
  input: any
  reason: string
  timestamp: number
  originalError?: string
  recovered: boolean
}

class SafeEngineLogger {
  private failures: FailureLog[] = []
  private maxLogs: number = 1000

  log(input: any, reason: string, originalError?: string, recovered: boolean = true): void {
    const log: FailureLog = {
      input: typeof input === "string" ? input.substring(0, 200) : input,
      reason,
      timestamp: Date.now(),
      originalError,
      recovered,
    }

    this.failures.push(log)

    if (this.failures.length > this.maxLogs) {
      this.failures.shift()
    }
  }

  getFailures(limit: number = 100): FailureLog[] {
    return this.failures.slice(-limit)
  }

  clearFailures(): void {
    this.failures = []
  }

  getStats() {
    return {
      totalFailures: this.failures.length,
      recentFailures: this.failures.slice(-10),
    }
  }
}

const logger = new SafeEngineLogger()

function getCurrentDateString(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, "0")
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

function inferTypeFromValue(value: number): TransactionType {
  if (Number.isNaN(value) || value === null || value === undefined) {
    return "EXPENSE"
  }
  return value < 0 ? "EXPENSE" : value > 0 ? "INCOME" : "EXPENSE"
}

function isValidType(type: any): type is TransactionType {
  return type === "INCOME" || type === "EXPENSE" || type === "INVESTIMENTO"
}

export function fallbackMinimalTransaction(input: any): SafeTransaction {
  let description = "UNKNOWN"

  try {
    if (typeof input === "string") {
      description = input.substring(0, 50)
    } else if (input && typeof input === "object") {
      if (input.description) {
        description = String(input.description).substring(0, 50)
      } else if (input.text) {
        description = String(input.text).substring(0, 50)
      }
    }
  } catch {
    description = "UNKNOWN"
  }

  return {
    date: getCurrentDateString(),
    type: "EXPENSE",
    category: "Outros",
    value: 0,
    description: description || "UNKNOWN",
    confidence: 0.1,
    source: "fallback",
    reviewRequired: true,
  }
}

export function sanitizeTransaction(tx: any): Partial<SafeTransaction> {
  const sanitized: Partial<SafeTransaction> = {}

  // Sanitize date
  try {
    if (tx.date && typeof tx.date === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(tx.date)) {
      sanitized.date = tx.date
    } else {
      sanitized.date = getCurrentDateString()
    }
  } catch {
    sanitized.date = getCurrentDateString()
  }

  // Sanitize type
  try {
    if (isValidType(tx.type)) {
      sanitized.type = tx.type
    } else if (typeof tx.value === "number") {
      sanitized.type = inferTypeFromValue(tx.value)
    } else {
      sanitized.type = "EXPENSE"
    }
  } catch {
    sanitized.type = "EXPENSE"
  }

  // Sanitize value
  try {
    const value = Number(tx.value)
    if (!Number.isNaN(value) && Number.isFinite(value)) {
      sanitized.value = Math.abs(value)
    } else {
      sanitized.value = 0
    }
  } catch {
    sanitized.value = 0
  }

  // Sanitize description
  try {
    if (tx.description && typeof tx.description === "string" && tx.description.trim().length > 0) {
      sanitized.description = tx.description.trim().substring(0, 200)
    } else {
      sanitized.description = "UNKNOWN"
    }
  } catch {
    sanitized.description = "UNKNOWN"
  }

  // Sanitize category
  try {
    if (tx.category && typeof tx.category === "string" && tx.category.trim().length > 0) {
      sanitized.category = tx.category.trim().substring(0, 50)
    } else {
      sanitized.category = "Outros"
    }
  } catch {
    sanitized.category = "Outros"
  }

  // Sanitize confidence
  try {
    const confidence = Number(tx.confidence)
    if (!Number.isNaN(confidence)) {
      sanitized.confidence = Math.max(0, Math.min(1, confidence))
    } else {
      sanitized.confidence = 0.5
    }
  } catch {
    sanitized.confidence = 0.5
  }

  return sanitized
}

export function finalSanityCheck(tx: any): boolean {
  // Check value is valid number
  if (typeof tx.value !== "number" || Number.isNaN(tx.value) || !Number.isFinite(tx.value)) {
    return false
  }

  // Check description exists and is string
  if (typeof tx.description !== "string" || tx.description.trim().length === 0) {
    return false
  }

  // Check type is valid
  if (!isValidType(tx.type)) {
    return false
  }

  // Check category exists and is string
  if (typeof tx.category !== "string" || tx.category.trim().length === 0) {
    return false
  }

  // Check confidence is valid number between 0-1
  if (typeof tx.confidence !== "number" || tx.confidence < 0 || tx.confidence > 1) {
    return false
  }

  // Check date format
  if (!tx.date || typeof tx.date !== "string") {
    return false
  }

  // Check source
  if (
    !tx.source ||
    (tx.source !== "parser" && tx.source !== "fallback" && tx.source !== "corrected")
  ) {
    return false
  }

  // Check reviewRequired is boolean
  if (typeof tx.reviewRequired !== "boolean") {
    return false
  }

  return true
}

export function ensureOutput(tx: any): SafeTransaction {
  if (finalSanityCheck(tx)) {
    return tx as SafeTransaction
  }

  const sanitized = sanitizeTransaction(tx)
  const source = (tx && tx.source) || "corrected"

  return {
    date: sanitized.date || getCurrentDateString(),
    type: sanitized.type || "EXPENSE",
    category: sanitized.category || "Outros",
    value: sanitized.value || 0,
    description: sanitized.description || "UNKNOWN",
    confidence: sanitized.confidence || 0.5,
    source: source as "parser" | "fallback" | "corrected",
    reviewRequired: (tx && tx.reviewRequired) !== false,
  }
}

export function safeParse(
  input: any,
  parseFunction?: (input: any) => Promise<any> | any
): SafeTransaction {
  try {
    if (!input) {
      logger.log(input, "Empty input", undefined, true)
      return fallbackMinimalTransaction(input)
    }

    let result = input

    // If parse function provided, use it
    if (parseFunction && typeof parseFunction === "function") {
      try {
        result = parseFunction(input)
        if (result instanceof Promise) {
          // Can't handle promises synchronously, use fallback
          throw new Error("Async parse function not supported in sync context")
        }
      } catch (parseError) {
        logger.log(input, "Parse function failed", String((parseError as Error).message), true)
        return fallbackMinimalTransaction(input)
      }
    }

    const sanitized = sanitizeTransaction(result)
    const output = ensureOutput(sanitized as any)

    if (!finalSanityCheck(output)) {
      logger.log(input, "Final sanity check failed", undefined, true)
      return fallbackMinimalTransaction(input)
    }

    return output
  } catch (error) {
    logger.log(input, "Unexpected error in safeParse", String((error as Error).message), true)
    return fallbackMinimalTransaction(input)
  }
}

export function preventDuplicates(transactions: SafeTransaction[]): SafeTransaction[] {
  if (transactions.length === 0) return []

  const seen = new Set<string>()
  const unique: SafeTransaction[] = []

  for (const tx of transactions) {
    // Create signature from description + value + date
    const signature = `${tx.description}|${tx.value}|${tx.date}`

    if (!seen.has(signature)) {
      seen.add(signature)
      unique.push(tx)
    }
  }

  return unique
}

export function validateBatch(transactions: any[]): SafeTransaction[] {
  if (!Array.isArray(transactions)) {
    logger.log(transactions, "Input is not an array", undefined, true)
    return [fallbackMinimalTransaction(transactions)]
  }

  const validated: SafeTransaction[] = []

  for (let i = 0; i < transactions.length; i++) {
    try {
      const tx = transactions[i]

      if (!tx) {
        logger.log(null, `Transaction at index ${i} is null/undefined`, undefined, true)
        validated.push(fallbackMinimalTransaction(null))
        continue
      }

      const sanitized = sanitizeTransaction(tx)
      const output = ensureOutput(sanitized as any)

      if (finalSanityCheck(output)) {
        validated.push(output)
      } else {
        logger.log(tx, `Transaction at index ${i} failed sanity check`, undefined, true)
        validated.push(fallbackMinimalTransaction(tx))
      }
    } catch (error) {
      logger.log(
        transactions[i],
        `Transaction at index ${i} threw error`,
        String((error as Error).message),
        true
      )
      validated.push(fallbackMinimalTransaction(transactions[i]))
    }
  }

  return validated
}

export function process(input: any, parseFunction?: (input: any) => any): SafeTransaction[] {
  try {
    // Step 1: Handle single transaction vs batch
    const isBatch = Array.isArray(input)
    const transactions = isBatch ? input : [input]

    // Step 2: Validate batch
    let validated = validateBatch(transactions)

    // Step 3: Parse with safety
    const parsed = validated.map((tx) => {
      try {
        if (parseFunction) {
          const result = parseFunction(tx)
          const sanitized = sanitizeTransaction(result)
          return ensureOutput(sanitized as any)
        }
        return tx
      } catch (error) {
        logger.log(tx, "Per-transaction parse failed", String((error as Error).message), true)
        return ensureOutput(tx)
      }
    })

    // Step 4: Prevent duplicates
    const deduped = preventDuplicates(parsed)

    // Step 5: Final validation
    const final = deduped.map((tx) => ensureOutput(tx as any))

    return final
  } catch (error) {
    logger.log(input, "Unexpected error in process", String((error as Error).message), true)
    return [fallbackMinimalTransaction(input)]
  }
}

export function processSafe(
  input: any,
  parseFunction?: (input: any) => any
): SafeTransaction[] | SafeTransaction {
  try {
    const result = process(input, parseFunction)
    return result.length === 1 ? result[0] : result
  } catch {
    const isSingle = !Array.isArray(input)
    const result = [fallbackMinimalTransaction(input)]
    return isSingle ? result[0] : result
  }
}

export function getFailureLogs(limit: number = 100): FailureLog[] {
  return logger.getFailures(limit)
}

export function getFailureStats() {
  return logger.getStats()
}

export function clearFailureLogs(): void {
  logger.clearFailures()
}

export function wrapContextualTransaction(
  tx: any,
  source: "parser" | "fallback" | "corrected" = "parser"
): SafeTransaction {
  try {
    const safe: SafeTransaction = {
      date: tx.date || getCurrentDateString(),
      type: isValidType(tx.type) ? tx.type : inferTypeFromValue(tx.value),
      category: tx.category || "Outros",
      value: Number.isFinite(tx.value) ? Math.abs(tx.value) : 0,
      description: (tx.description || "UNKNOWN").substring(0, 200),
      confidence: Math.max(0, Math.min(1, tx.confidence || 0.5)),
      source,
      reviewRequired: (tx as any).reviewRequired !== false,
    }
    return safe
  } catch (error) {
    logger.log(tx, "Failed to wrap contextual transaction", String((error as Error).message), true)
    return fallbackMinimalTransaction(tx)
  }
}

export function wrapEnrichedTransaction(
  tx: any,
  source: "parser" | "fallback" | "corrected" = "parser"
): SafeTransaction {
  return wrapContextualTransaction(tx, source)
}
