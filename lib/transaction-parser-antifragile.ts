import {
  normalize,
  normalizeForDisplay,
  detectType,
  classifyCategory,
} from "../transaction-normalizer-fixed"

type TransactionType = "INCOME" | "EXPENSE" | "INVESTIMENTO"

interface ParsedTransaction {
  date: string
  type: TransactionType
  category: string
  value: number
  description: string
  confidence: number
}

interface ParseBlock {
  description: string
  value: number | null
  raw: string
}

interface AIFallbackResult {
  description: string
  value: number
  type: TransactionType
}

// STEP 1: Flexible Value Extraction
function extractValue(text: string): number | null {
  const valuePattern = /\d+(?:\.\d{3})*,\d{2}/g
  const matches = Array.from(text.matchAll(valuePattern))

  if (matches.length === 0) {
    return null
  }

  const lastMatch = matches[matches.length - 1][0]
  const normalized = lastMatch.replace(/\./g, "").replace(",", ".")
  return parseFloat(normalized)
}

// STEP 2: Smart Line Grouping with Date Detection
function detectDate(line: string): boolean {
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{4}/, // DD/MM/YYYY
    /\d{1,2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+\d{4}/, // DD MON YYYY
    /^(\d{1,2})$/, // Just day at start
  ]

  return datePatterns.some((pattern) => pattern.test(line.trim()))
}

function groupLinesAntifragile(lines: string[]): string[] {
  const groups: string[] = []
  let currentGroup = ""
  const valuePattern = /\d+(?:\.\d{3})*,\d{2}/

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (!trimmedLine) continue

    // Check if line starts with date (new transaction)
    if (detectDate(trimmedLine) && currentGroup.length > 0) {
      groups.push(currentGroup.trim())
      currentGroup = trimmedLine
      continue
    }

    // Add line to current group
    currentGroup += (currentGroup ? " " : "") + trimmedLine

    // Check if line contains value (end of transaction)
    if (valuePattern.test(trimmedLine)) {
      groups.push(currentGroup.trim())
      currentGroup = ""
    }
  }

  if (currentGroup.trim()) {
    groups.push(currentGroup.trim())
  }

  return groups
}

// STEP 3: Robust Block Parsing
function parseBlock(block: string): ParseBlock {
  const value = extractValue(block)

  // Remove value from text
  let description = block
  if (value !== null) {
    const valuePattern = /\d{1,3}(\.\d{3})*,\d{2}/
    description = description.replace(valuePattern, "").trim()
  }

  // Remove bank metadata patterns
  const metadataPatterns = [
    /agência\s*:?\s*\d+/gi,
    /conta\s*:?\s*\d+/gi,
    /cpf\s*:?\s*[\d*\-\.]+/gi,
    /dígito\s*:?\s*\d+/gi,
    /comprovante\s*:?\s*[\w\d]+/gi,
    /referência\s*:?\s*[\w\d]+/gi,
    /protocolo\s*:?\s*[\w\d]+/gi,
    /código\s*:?\s*[\w\d]+/gi,
    /banco\s*:?\s*[\w\d\s]+/gi,
    /ramo\s*:?\s*\d+/gi,
  ]

  for (const pattern of metadataPatterns) {
    description = description.replace(pattern, "").trim()
  }

  // Clean up extra whitespace
  description = description
    .replace(/\s+/g, " ")
    .replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s+/, "") // Remove date at start
    .trim()

  return {
    description,
    value,
    raw: block,
  }
}

// STEP 4: Confidence Score Calculation
function calculateConfidence(tx: {
  value: number | null
  description: string
  type: TransactionType
  category: string
}): number {
  let score = 0
  let maxScore = 4

  if (tx.value !== null && !isNaN(tx.value)) score++
  if (tx.description && tx.description.trim().length > 3) score++
  if (tx.type) score++
  if (tx.category && tx.category !== "Outros") score++

  return maxScore > 0 ? score / maxScore : 0
}

// STEP 5: Fallback Detection
function needsFallback(tx: {
  value: number | null
  description: string
  confidence: number
}): boolean {
  return tx.value === null || tx.description.trim().length === 0 || tx.confidence < 0.7
}

// STEP 6: AI Fallback
async function aiFallback(block: string): Promise<AIFallbackResult | null> {
  try {
    const valueMatch = extractValue(block)
    if (valueMatch === null) {
      return null
    }

    // Remove value to get description
    let description = block.replace(/\d{1,3}(\.\d{3})*,\d{2}/, "").trim()

    // Detect type from keywords
    const descLower = description.toLowerCase()
    let type: TransactionType = "EXPENSE"

    if (descLower.includes("resgate")) {
      type = "INCOME"
    } else if (
      descLower.includes("aplicacao") ||
      descLower.includes("investimento") ||
      descLower.includes("rdb") ||
      descLower.includes("cdb") ||
      descLower.includes("fundo")
    ) {
      type = "INVESTIMENTO"
    } else if (
      descLower.includes("deposito") ||
      descLower.includes("transferencia recebida") ||
      descLower.includes("salario") ||
      descLower.includes("folha")
    ) {
      type = "INCOME"
    }

    return {
      description: normalize(description),
      value: Math.abs(valueMatch),
      type,
    }
  } catch (error) {
    return null
  }
}

// STEP 7: Final Antifragile Pipeline
export async function parseTransactionsAntifragile(text: string): Promise<ParsedTransaction[]> {
  if (!text || text.trim().length === 0) {
    return []
  }

  // 1. Split and clean lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // 2. Group lines intelligently
  const groups = groupLinesAntifragile(lines)

  const results: ParsedTransaction[] = []

  // 3-6. Process each block
  for (const group of groups) {
    const block = parseBlock(group)

    if (!block.description && block.value === null) {
      continue
    }

    // Normalize description
    const normalizedDesc = block.description ? normalizeForDisplay(block.description) : ""

    // Detect type and category
    const type =
      block.value !== null
        ? detectType(block.value, block.description)
        : ("EXPENSE" as TransactionType)
    const category = block.description ? classifyCategory(block.description) : "Outros"

    // Calculate confidence
    const confidence = calculateConfidence({
      value: block.value,
      description: normalizedDesc,
      type,
      category,
    })

    // Check if fallback is needed
    if (needsFallback({ value: block.value, description: normalizedDesc, confidence })) {
      const fallback = await aiFallback(group)
      if (fallback) {
        const fallbackCategory = classifyCategory(fallback.description)
        results.push({
          date: extractDateFromBlock(group),
          type: fallback.type,
          category: fallbackCategory,
          value: fallback.value,
          description: fallback.description,
          confidence: 0.6,
        })
      }
      continue
    }

    // Valid transaction
    if (block.value !== null && normalizedDesc.length > 0) {
      results.push({
        date: extractDateFromBlock(group),
        type,
        category,
        value: Math.abs(block.value),
        description: normalizedDesc,
        confidence,
      })
    }
  }

  return results
}

// Helper: Extract date from block
function extractDateFromBlock(block: string): string {
  const dateMatch = block.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split("/")
    return `${year}-${month}-${day}`
  }
  return new Date().toISOString().split("T")[0]
}

// Export types and functions
export {
  groupLinesAntifragile,
  parseBlock,
  calculateConfidence,
  needsFallback,
  aiFallback,
  extractValue,
}
export type { ParsedTransaction, ParseBlock, AIFallbackResult }
