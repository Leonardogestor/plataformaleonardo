// @ts-nocheck
/**
 * Bank-specific statement parsers for PDF-extracted text.
 * Each parser returns normalized transactions (date ISO, description, amount, type).
 * Decimal separator normalized to dot; amount always positive; type INCOME | EXPENSE.
 */

export type BankId = "itau" | "bradesco" | "nubank" | "generic"

export interface NormalizedTransactionRow {
  date: string // YYYY-MM-DD
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
}

/**
 * Detects bank from statement text (keyword-based).
 */
export function detectBankFromText(text: string): BankId {
  const lower = text.toLowerCase().replace(/\s+/g, " ")
  if (lower.includes("itau") || lower.includes("itaú") || lower.includes("itau unibanco")) return "itau"
  if (lower.includes("bradesco")) return "bradesco"
  if (lower.includes("nubank") || lower.includes("nu pagamentos") || lower.includes("nu bank")) return "nubank"
  return "generic"
}

/** Normalize decimal: "1.234,56" or "1,234.56" -> 1234.56 */
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(/[R$\s]/gi, "")
  const hasCommaDecimal = /,\d{2}$/.test(cleaned) || /,\d{1,2}$/.test(cleaned)
  let num: string
  if (hasCommaDecimal) {
    num = cleaned.replace(/\./g, "").replace(",", ".")
  } else {
    num = cleaned.replace(/,/g, "")
  }
  const value = parseFloat(num)
  return Number.isFinite(value) ? Math.abs(value) : 0
}

/** DD/MM or DD/MM/YYYY -> YYYY-MM-DD */
function toISODate(d: string): string {
  const parts = d.split(/[/\-.]/).map((p) => p.trim())
  if (parts.length >= 3) {
    const day = parts[0]?.padStart(2, "0") ?? "01"
    const month = parts[1]?.padStart(2, "0") ?? "01"
    const year = parts[2]?.length === 4 ? parts[2] : `20${parts[2] ?? "00"}`
    return `${year}-${month}-${day}`
  }
  if (parts.length === 2) {
    const day = parts[0]?.padStart(2, "0") ?? "01"
    const month = parts[1]?.padStart(2, "0") ?? "01"
    const year = new Date().getFullYear()
    return `${year}-${month}-${day}`
  }
  return new Date().toISOString().slice(0, 10)
}

/** Detect if amount is credit (income) from context: negative value, "credito", "entrada", "cr", etc. */
function isCreditFromRaw(raw: string, _amount: number): boolean {
  const lower = raw.toLowerCase()
  if (lower.includes("cr") || lower.includes("credito") || lower.includes("entrada") || lower.includes("receb")) return true
  if (lower.includes("db") || lower.includes("debito") || lower.includes("saida") || lower.includes("pagto")) return false
  return false
}

/**
 * Itaú: common patterns like "DD/MM  DESC  VALOR" or "DD/MM/YYYY  ...  R$ 1.234,56"
 */
export function parseItauStatement(text: string): NormalizedTransactionRow[] {
  const rows: NormalizedTransactionRow[] = []
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const dateAmountRe = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+?)\s+([-]?[\d.,]+)\s*$/
  for (const line of lines) {
    const m = line.match(dateAmountRe)
    if (m) {
      const [, d, mo, y, desc, amountRaw] = m
      const dateStr = y ? `${d}/${mo}/${y}` : `${d}/${mo}`
      if (!amountRaw) continue
      const amount = parseAmount(amountRaw)
      if (amount <= 0) continue
      const type: "INCOME" | "EXPENSE" =
        amountRaw.trim().startsWith("-")
          ? "EXPENSE"
          : isCreditFromRaw(amountRaw, amount)
            ? "INCOME"
            : "EXPENSE"
      rows.push({
        date: toISODate(dateStr),
        description: desc.trim().slice(0, 500) || "Transação",
        amount,
        type,
      })
    }
  }
  return rows
}

/**
 * Bradesco: similar to Itaú; "DD/MM  Descrição  Valor"
 */
export function parseBradescoStatement(text: string): NormalizedTransactionRow[] {
  const rows: NormalizedTransactionRow[] = []
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const dateAmountRe = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+?)\s+([-]?[\d.,]+)\s*$/
  for (const line of lines) {
    const m = line.match(dateAmountRe)
    if (m) {
      const [, d, mo, y, desc, amountRaw] = m
      const dateStr = y ? `${d}/${mo}/${y}` : `${d}/${mo}`
      const amount = parseAmount(amountRaw)
      if (amount <= 0) continue
      const type: "INCOME" | "EXPENSE" =
        amountRaw.trim().startsWith("-")
          ? "EXPENSE"
          : isCreditFromRaw(amountRaw, amount)
            ? "INCOME"
            : "EXPENSE"
      rows.push({
        date: toISODate(dateStr),
        description: desc.trim().slice(0, 500) || "Transação",
        amount,
        type,
      })
    }
  }
  return rows
}

/**
 * Nubank: often table with date, description, value (negative = expense).
 */
export function parseNubankStatement(text: string): NormalizedTransactionRow[] {
  const rows: NormalizedTransactionRow[] = []
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const dateAmountRe = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+?)\s+([-]?[\d.,]+)\s*$/
  for (const line of lines) {
    const m = line.match(dateAmountRe)
    if (m) {
      const [, d, mo, y, desc, amountRaw] = m
      const dateStr = y ? `${d}/${mo}/${y}` : `${d}/${mo}`
      const amount = parseAmount(amountRaw)
      if (amount <= 0) continue
      const isNegative = amountRaw.trim().startsWith("-")
      rows.push({
        date: toISODate(dateStr),
        description: desc.trim().slice(0, 500) || "Transação",
        amount,
        type: isNegative ? "EXPENSE" : "INCOME",
      })
    }
  }
  return rows
}

/**
 * Generic: look for lines that contain a date-like part and a number (Brazilian format).
 */
export function fallbackGenericParser(text: string): NormalizedTransactionRow[] {
  const rows: NormalizedTransactionRow[] = []
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const re = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+?)\s+([-]?[\d.,]+)\s*$/
  for (const line of lines) {
    const m = line.match(re)
    if (m) {
      const [, d, mo, y, desc, amountRaw] = m
      const dateStr = y ? `${d}/${mo}/${y}` : `${d}/${mo}`
      const amount = parseAmount(amountRaw)
      if (amount <= 0) continue
      const isNegative = amountRaw.trim().startsWith("-")
      rows.push({
        date: toISODate(dateStr),
        description: desc.trim().slice(0, 500) || "Transação",
        amount,
        type: isNegative ? "EXPENSE" : "INCOME",
      })
    }
  }
  return rows
}

/**
 * Parse statement text with bank-specific parser; falls back to generic.
 */
export function parseStatementByBank(text: string): NormalizedTransactionRow[] {
  const bank = detectBankFromText(text)
  switch (bank) {
    case "itau":
      return parseItauStatement(text)
    case "bradesco":
      return parseBradescoStatement(text)
    case "nubank":
      return parseNubankStatement(text)
    default:
      return fallbackGenericParser(text)
  }
}
