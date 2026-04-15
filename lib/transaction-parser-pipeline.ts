import {
  normalize,
  normalizeForDisplay,
  detectType,
  classifyCategory,
  normalizeTransaction as legacyNormalizeTransaction,
  TransactionType,
} from "@/transaction-normalizer-fixed"

type TransactionType = "INCOME" | "EXPENSE" | "INVESTIMENTO"

interface Transaction {
  date: string
  description: string
  value: number
}

interface ParsedTransaction {
  date: string
  type: TransactionType
  category: string
  value: number
  description: string
}

interface ValidationResult {
  isValid: boolean
  reason?: string
}

interface AIFallbackResult {
  description: string
  value: number
  type: TransactionType
}

// STEP 1: Input already parsed from PDF

// STEP 2: Clean lines
function cleanLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

// STEP 3: Group lines by transaction
function groupLines(lines: string[]): string[] {
  const groups: string[] = []
  let currentGroup = ""
  const valuePattern = /\d+[.,]\d{2}$/

  for (const line of lines) {
    currentGroup += (currentGroup ? " " : "") + line

    if (valuePattern.test(line.trim())) {
      if (currentGroup.trim()) {
        groups.push(currentGroup.trim())
      }
      currentGroup = ""
    }
  }

  if (currentGroup.trim()) {
    groups.push(currentGroup.trim())
  }

  return groups
}

// STEP 4: Extract structural data
function extractStructuralData(
  block: string
): { description: string; value: number; raw: string } | null {
  const valuePattern = /([-+]?[\d.]+,\d{2})\s*$/
  const match = block.match(valuePattern)

  if (!match) {
    return null
  }

  const valueStr = match[1]
  const valueNum = parseFloat(valueStr.replace(".", "").replace(",", "."))
  const description = block.substring(0, block.length - valueStr.length).trim()

  const bankMetadataPattern =
    /agência|conta|banco|ramo|dígito|código|referência|lote|sequência|comprovante/i

  if (bankMetadataPattern.test(description)) {
    return null
  }

  return {
    description,
    value: valueNum,
    raw: block,
  }
}

// STEP 5: Use existing logic
function applyExistingLogic(
  description: string,
  value: number
): {
  type: TransactionType
  category: string
  displayDesc: string
} {
  const type = detectType(value, description) as TransactionType
  const category = classifyCategory(description)
  const displayDesc = normalizeForDisplay(description)

  return {
    type,
    category,
    displayDesc,
  }
}

// STEP 6: Validation
function isValidTransaction(tx: {
  description?: string
  value?: number
  type?: string
  category?: string
}): ValidationResult {
  if (!tx.description || tx.description.trim().length === 0) {
    return { isValid: false, reason: "Missing description" }
  }

  if (typeof tx.value !== "number" || isNaN(tx.value) || tx.value === 0) {
    return { isValid: false, reason: "Invalid or missing value" }
  }

  const summaryPatterns = [
    /total de saídas/i,
    /total de entradas/i,
    /saldo anterior/i,
    /saldo final/i,
    /saldo em/i,
    /movimentação total/i,
  ]

  if (summaryPatterns.some((pattern) => pattern.test(tx.description))) {
    return { isValid: false, reason: "Summary line detected" }
  }

  return { isValid: true }
}

// STEP 7: AI Fallback
async function aiFallback(block: string): Promise<AIFallbackResult | null> {
  try {
    const valuePattern = /([-+]?[\d.]+,\d{2})/g
    const matches = Array.from(block.matchAll(valuePattern))

    if (matches.length === 0) {
      return null
    }

    const valueStr = matches[matches.length - 1][1]
    const value = parseFloat(valueStr.replace(".", "").replace(",", "."))

    const textWithoutValue = block.replace(valuePattern, "").trim()

    let type: TransactionType = "EXPENSE"
    let description = textWithoutValue

    const typePatterns = {
      INCOME: [/resgate/i, /receita/i, /transferencia recebida/i, /deposito/i],
      INVESTIMENTO: [/aplicacao/i, /investimento/i, /rdb/i, /cdb/i, /fundo/i],
      EXPENSE: [/pagamento/i, /compra/i, /transferencia enviada/i],
    }

    for (const [txType, patterns] of Object.entries(typePatterns)) {
      if (patterns.some((p) => p.test(textWithoutValue))) {
        type = txType as TransactionType
        break
      }
    }

    const categoryPatterns: Record<string, RegExp[]> = {
      Alimentação: [/ifood/i, /restaurante/i, /padaria/i, /lanchonete/i, /pizza/i, /delivery/i],
      Transporte: [/uber/i, /99/i, /taxi/i, /combustivel/i, /transporte/i],
      Saúde: [/farmacia/i, /drogaria/i, /medico/i, /hospital/i, /clinica/i],
      Mercado: [/mercado/i, /supermercado/i, /carrefour/i, /atacadao/i],
      Investimento: [/aplicacao/i, /rdb/i, /cdb/i, /fundo/i],
    }

    for (const [cat, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some((p) => p.test(description))) {
        // Category embedded in type detection
        break
      }
    }

    return {
      description: normalize(description),
      value: Math.abs(value),
      type,
    }
  } catch (error) {
    console.error("[Fallback] Error:", error)
    return null
  }
}

// Main pipeline
export async function parseTransactionsPipeline(text: string): Promise<ParsedTransaction[]> {
  // STEP 2: Clean
  const lines = cleanLines(text)

  // STEP 3: Group
  const groups = groupLines(lines)

  const results: ParsedTransaction[] = []

  for (const group of groups) {
    // STEP 4: Extract
    const extracted = extractStructuralData(group)

    if (!extracted) {
      continue
    }

    // STEP 5: Apply existing logic
    const processed = applyExistingLogic(extracted.description, extracted.value)

    // STEP 6: Validate
    const validation = isValidTransaction({
      description: processed.displayDesc,
      value: extracted.value,
      type: processed.type,
      category: processed.category,
    })

    if (validation.isValid) {
      // Extract date if present
      const datePattern = /(\d{2}\/\d{2}\/\d{4})/
      const dateMatch = extracted.raw.match(datePattern)
      const date = dateMatch
        ? convertDateToISO(dateMatch[1])
        : new Date().toISOString().split("T")[0]

      results.push({
        date,
        type: processed.type,
        category: processed.category,
        value: Math.abs(extracted.value),
        description: processed.displayDesc,
      })
    } else {
      // STEP 7: Try fallback
      const fallbackResult = await aiFallback(group)

      if (fallbackResult) {
        const datePattern = /(\d{2}\/\d{2}\/\d{4})/
        const dateMatch = group.match(datePattern)
        const date = dateMatch
          ? convertDateToISO(dateMatch[1])
          : new Date().toISOString().split("T")[0]

        results.push({
          date,
          type: fallbackResult.type,
          category: classifyCategory(fallbackResult.description),
          value: fallbackResult.value,
          description: fallbackResult.description,
        })
      }
    }
  }

  return results
}

// Helper to convert date format
function convertDateToISO(dateStr: string): string {
  const parts = dateStr.split("/")
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
  }
  return new Date().toISOString().split("T")[0]
}

// Export functions
export {
  groupLines,
  extractStructuralData,
  isValidTransaction,
  aiFallback,
  cleanLines,
  applyExistingLogic,
}

export type { ParsedTransaction, ValidationResult, AIFallbackResult }
