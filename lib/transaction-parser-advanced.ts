/**
 * ADVANCED CONFIGURATION & EDGE CASE HANDLING
 * Extended pipeline with custom rules and bank-specific configurations
 */

import {
  parseTransactionsPipeline,
  groupLines,
  isValidTransaction,
  aiFallback,
  type ParsedTransaction,
} from "@/lib/transaction-parser-pipeline"

interface BankConfig {
  name: string
  valuePattern: RegExp
  datePattern: RegExp
  multilineThreshold: number
  ignoredPatterns: RegExp[]
  customCategoryRules?: Record<string, RegExp[]>
}

const BANK_CONFIGS: Record<string, BankConfig> = {
  nubank: {
    name: "Nubank",
    valuePattern: /\d+[.,]\d{2}$/,
    datePattern: /(\d{2}\/\d{2}\/\d{4})/,
    multilineThreshold: 3,
    ignoredPatterns: [/agência/i, /conta/i, /dígito/i, /comprovante/i, /referência/i],
    customCategoryRules: {
      Alimentação: [/ifood/i, /delivery/i, /restaurante/i],
      Investimento: [/aplicacao.*rdb/i, /investimento/i, /cdb/i],
    },
  },
  itau: {
    name: "Itaú",
    valuePattern: /(-?\d+\.\d+,\d{2})$/,
    datePattern: /(\d{2}\/\d{2}\/\d{4})/,
    multilineThreshold: 2,
    ignoredPatterns: [/REFERÊNCIA API/i, /PROTOCOLO/i],
  },
  bradesco: {
    name: "Bradesco",
    valuePattern: /\d+,\d{2}$/,
    datePattern: /(\d{1,2}\/\d{1,2}\/\d{4})/,
    multilineThreshold: 3,
    ignoredPatterns: [/Movimentação/i],
  },
  santander: {
    name: "Santander",
    valuePattern: /\d+\.\d{2}$/,
    datePattern: /(\d{2}\/\d{2}\/\d{4})/,
    multilineThreshold: 2,
    ignoredPatterns: [/AGÊNCIA/i, /BANCO/i],
  },
}

interface ParseOptions {
  bankHint?: string
  strictMode?: boolean
  ignoreMetadata?: boolean
  customRules?: Record<string, string[]>
}

export async function parseWithBankConfig(
  text: string,
  options: ParseOptions = {}
): Promise<ParsedTransaction[]> {
  const config = options.bankHint
    ? BANK_CONFIGS[options.bankHint.toLowerCase()]
    : BANK_CONFIGS.nubank

  const transactions = await parseTransactionsPipeline(text)

  if (options.strictMode) {
    return transactions.filter((tx) => {
      if (options.ignoreMetadata) {
        for (const pattern of config.ignoredPatterns) {
          if (pattern.test(tx.description)) {
            return false
          }
        }
      }
      return true
    })
  }

  return transactions
}

// Edge case handlers
export function handleMultilineInvestmentTransaction(block: string): {
  description: string
  value: number
} | null {
  const lines = block.split("\n").filter((l) => l.trim())

  const hasInvestmentKeyword = lines.some((l) => /aplicacao|rdb|cdb|fundo|investimento/i.test(l))

  if (!hasInvestmentKeyword) return null

  const valueMatch = block.match(/(\d+[.,]\d{2})/)
  if (!valueMatch) return null

  const value = parseFloat(valueMatch[1].replace(".", "").replace(",", "."))

  return {
    description: lines.join(" ").trim(),
    value,
  }
}

export function handleMultilineDeliveryTransaction(block: string): {
  description: string
  value: number
} | null {
  const lines = block.split("\n").filter((l) => l.trim())

  const hasDeliveryKeyword = lines.some((l) => /ifood|delivery|uber eats|rappi/i.test(l))

  if (!hasDeliveryKeyword) return null

  const valueMatch = block.match(/(\d+[.,]\d{2})/)
  if (!valueMatch) return null

  const value = parseFloat(valueMatch[1].replace(".", "").replace(",", "."))

  return {
    description: `Alimentação - ${lines.join(" ")}`.trim(),
    value,
  }
}

export function handleSummaryLineFiltering(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const summaryKeywords = [
    /^total\s+(de\s+)?(entradas|saídas|movimentação)/i,
    /^saldo\s+(anterior|final|em)/i,
    /^movimentação\s+total/i,
    /^rendimento/i,
    /^limite/i,
  ]

  return transactions.filter((tx) => {
    const desc = tx.description.toLowerCase()
    return !summaryKeywords.some((pattern) => pattern.test(desc))
  })
}

export function detectBankFormat(text: string): string {
  const patterns = {
    nubank: /nubank|repositório.*nubank|conta.*nubank/i,
    itau: /itaú|itau/i,
    bradesco: /bradesco/i,
    santander: /santander/i,
  }

  for (const [bank, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return bank
    }
  }

  return "unknown"
}

export async function intelligentParse(text: string): Promise<{
  transactions: ParsedTransaction[]
  bankDetected: string
  confidence: number
}> {
  const detectedBank = detectBankFormat(text)

  const transactions = await parseWithBankConfig(text, {
    bankHint: detectedBank === "unknown" ? undefined : detectedBank,
    ignoreMetadata: true,
  })

  const filtered = handleSummaryLineFiltering(transactions)

  return {
    transactions: filtered,
    bankDetected: detectedBank,
    confidence: transactions.length > 0 ? 0.95 : 0.3,
  }
}

// Performance optimization for large statements
export async function parseLargeStatement(
  text: string,
  chunkSize: number = 50
): Promise<ParsedTransaction[]> {
  const lines = text.split("\n").filter((l) => l.trim())
  const chunks: string[] = []

  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push(lines.slice(i, i + chunkSize).join("\n"))
  }

  const allTransactions: ParsedTransaction[] = []

  for (const chunk of chunks) {
    const transactions = await parseTransactionsPipeline(chunk)
    allTransactions.push(...transactions)
  }

  return handleSummaryLineFiltering(allTransactions)
}

export { BANK_CONFIGS }
export type { BankConfig, ParseOptions }
