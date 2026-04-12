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
 * Nubank: extrato no formato "DD MMM YYYY Total de entradas/saídas"
 * com transações em linhas subsequentes: "Descrição ... VALOR" ou VALOR em linha própria.
 * Exemplo:
 *   01 SET 2025 Total de entradas + 917,77
 *   Estorno - Transferência enviada pelo Pix ALELO... 70,00
 *   Total de saídas - 1.348,97
 *   Compra no débito IFD*IFOOD CLUB 5,95
 */
export function parseNubankStatement(text: string): NormalizedTransactionRow[] {
  const rows: NormalizedTransactionRow[] = []
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)

  const monthMap: Record<string, string> = {
    JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
    JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
  }

  // Matches: "01 SET 2025" or "01 SET 2025 Total de entradas + 917,77"
  const dateHeaderRe = /^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i
  // Matches a line that IS ONLY an amount, e.g. "70,00" or "1.234,56"
  const onlyAmountRe = /^[\d.]+,\d{2}$/
  // Matches a line ending with an amount after some text
  const endsWithAmountRe = /^(.+?)\s+([\d.]+,\d{2})$/

  let currentDate = new Date().toISOString().slice(0, 10)
  let currentType: "INCOME" | "EXPENSE" = "EXPENSE"
  let descParts: string[] = []

  const flushPending = (amount: number) => {
    if (descParts.length === 0) return
    const description = descParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 500) || "Transação"
    rows.push({ date: currentDate, description, amount, type: currentType })
    descParts = []
  }

  for (const line of lines) {
    // Skip section total lines, but capture type
    if (/total de entradas/i.test(line)) { currentType = "INCOME"; descParts = []; continue }
    if (/total de saídas/i.test(line))   { currentType = "EXPENSE"; descParts = []; continue }
    // Skip footer/header junk
    if (/^(saldo|rendimento|extrato gerado|tem alguma|ouvidoria|nu financeira|nu pagamentos|cnpj|atendimento)/i.test(line)) continue

    // Date header → update current date
    const dateMatch = line.match(dateHeaderRe)
    if (dateMatch) {
      const [, day, monthName, year] = dateMatch
      const month = monthMap[monthName.toUpperCase()] ?? "01"
      currentDate = `${year}-${month}-${day.padStart(2, "0")}`
      descParts = []
      continue
    }

    // Line is ONLY an amount → close pending description
    if (onlyAmountRe.test(line)) {
      const amount = parseAmount(line)
      if (amount > 0) flushPending(amount)
      continue
    }

    // Line ends with an amount (description + amount on same line)
    const endMatch = line.match(endsWithAmountRe)
    if (endMatch) {
      const [, desc, amountRaw] = endMatch
      const amount = parseAmount(amountRaw)
      if (amount > 0) {
        // Flush any pending multi-line desc first (attach this desc too)
        descParts.push(desc.trim())
        flushPending(amount)
        continue
      }
    }

    // Otherwise accumulate as part of a multi-line description
    descParts.push(line)
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
