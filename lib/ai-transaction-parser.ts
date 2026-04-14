/**
 * AI-powered transaction parser for Brazilian bank statements.
 * Sends extracted PDF/Excel text to OpenAI and returns structured transactions.
 * Works with any bank format — no regex required.
 */

import { z } from "zod"

const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string().min(1),
  confidence: z.number().min(0).max(1),
})

const aiParserResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  summary: z.object({
    totalProcessed: z.number(),
    successful: z.number(),
    confidence: z.number(),
    notes: z.string().optional(),
  }),
})

export type ParsedTransaction = z.infer<typeof transactionSchema>
export type AIParserResponse = z.infer<typeof aiParserResponseSchema>

const DEFAULT_CATEGORY = "Outros"
const DEFAULT_CONFIDENCE = 0.7
const MONTH_MAP: Record<string, string> = {
  JAN: "01",
  FEV: "02",
  FEB: "02",
  MAR: "03",
  ABR: "04",
  APR: "04",
  MAI: "05",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  AUG: "08",
  SET: "09",
  SEP: "09",
  OUT: "10",
  OCT: "10",
  NOV: "11",
  DEZ: "12",
  DEC: "12",
}

const SYSTEM_PROMPT = `Você é um parser financeiro altamente especializado em extratos bancários do Nubank (Brasil).

Seu trabalho é transformar texto bruto em uma lista estruturada de transações financeiras.

⚠️ CONTEXTO IMPORTANTE:
O texto pode estar desorganizado, com quebras erradas, múltiplas informações juntas e ruídos (cabeçalhos, saldos, resumos).

⚠️ SUA MISSÃO:
Identificar e extrair SOMENTE transações financeiras reais.

---

📌 REGRAS DE INTERPRETAÇÃO:

1. Cada transação contém:
- Data (ex: 01 JAN 2026)
- Descrição (texto livre)
- Valor (sempre no final)

2. Ignore completamente:
- "Saldo inicial", "Saldo final"
- "Total de entradas", "Total de saídas"
- Cabeçalhos (CPF, Agência, Conta)
- Linhas institucionais

3. Valores:
- Valores positivos → "income"
- Valores negativos OU compras → "expense"
- "Compra no débito" → sempre expense
- "Transferência recebida" → income
- "Transferência enviada" → expense
- "Pix recebido" → income
- "Pix enviado" → expense

4. Datas:
Converter de:
"01 JAN 2026"
para:
"2026-01-01"

Meses:
JAN=01, FEV=02, MAR=03, ABR=04, MAI=05, JUN=06,
JUL=07, AGO=08, SET=09, OUT=10, NOV=11, DEZ=12

5. Valor:
- Converter "50,00" → 50.00
- Sempre número (float)
- Negativo para despesas

---

📌 FORMATO DE SAÍDA (OBRIGATÓRIO):

Retorne APENAS JSON válido.

Se nenhuma transação for encontrada, retorne:
[]

Formato:

[
  {
    "date": "2026-01-01",
    "description": "Compra no débito ORION",
    "amount": -50.00,
    "type": "expense"
  }
]

---

📌 REGRAS CRÍTICAS:

- NUNCA invente dados
- NUNCA explique nada
- NUNCA retorne texto fora do JSON
- Se estiver em dúvida → ignore a linha
- Cada objeto = uma transação

---

📌 EXEMPLO DE ENTRADA:

01 JAN 2026 Compra no débito ORION 50,00  
02 JAN 2026 Transferência recebida PIX JOAO 200,00  
03 JAN 2026 Compra no débito PADARIA CENTRAL 30,50  

---

📌 EXEMPLO DE SAÍDA:

[
  {
    "date": "2026-01-01",
    "description": "Compra no débito ORION",
    "amount": -50.00,
    "type": "expense"
  },
  {
    "date": "2026-01-02",
    "description": "Transferência recebida PIX JOAO",
    "amount": 200.00,
    "type": "income"
  },
  {
    "date": "2026-01-03",
    "description": "Compra no débito PADARIA CENTRAL",
    "amount": -30.50,
    "type": "expense"
  }
]

---
`;

function buildUserPrompt(text: string, bankHint?: string): string {
  return `${bankHint ? `Banco detectado: ${bankHint}\n\n` : ""}Texto do extrato bancário:

${text}

Retorne um JSON com TODAS as transações encontradas neste extrato. Formato:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Descrição clara da transação",
      "amount": 123.45,
      "type": "INCOME" ou "EXPENSE",
      "category": "Categoria",
      "confidence": 0.95
    }
  ],
  "summary": {
    "totalProcessed": número de transações encontradas,
    "successful": número de transações com confiança >= 0.7,
    "confidence": confiança média geral,
    "notes": "observações sobre o extrato"
  }
}`
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const slashMatch = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month}-${day}`
  }

  const monthNameMatch = trimmed.match(/^(\d{2})\s+([A-ZÇ]{3})\s+(\d{4})$/)
  if (monthNameMatch) {
    const [, day, rawMonth, year] = monthNameMatch
    if (!rawMonth) return null
    const month = MONTH_MAP[rawMonth as keyof typeof MONTH_MAP]
    if (month) {
      return `${year}-${month}-${day}`
    }
  }

  return null
}

function inferType(description: string, signedAmount: number): "INCOME" | "EXPENSE" | "TRANSFER" {
  const normalized = description.toLowerCase()

  if (signedAmount < 0) return "EXPENSE"
  if (signedAmount > 0) return "INCOME"

  if (/(pix|transfer[eê]ncia|ted|doc)/i.test(normalized)) return "TRANSFER"
  if (
    /(compra|pagamento|d[eé]bito|debito|saque|tarifa|boleto|ifood|uber|mercado|padaria|farmacia)/i.test(
      normalized
    )
  ) {
    return "EXPENSE"
  }
  if (/(recebido|recebida|sal[aá]rio|deposito|dep[oó]sito|rendimento|cr[eé]dito|credito)/i.test(normalized)) {
    return "INCOME"
  }

  return "EXPENSE"
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const negative = /-/.test(trimmed)
  const normalized = trimmed
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "")

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return null

  return negative ? -Math.abs(parsed) : parsed
}

function extractTransactionsPayload(parsed: unknown): {
  transactions: unknown[]
  summary?: Record<string, unknown>
} {
  if (Array.isArray(parsed)) {
    return { transactions: parsed }
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>

    if (Array.isArray(record.transactions)) {
      return {
        transactions: record.transactions,
        summary:
          record.summary && typeof record.summary === "object"
            ? (record.summary as Record<string, unknown>)
            : undefined,
      }
    }

    if (record.data && typeof record.data === "object") {
      const data = record.data as Record<string, unknown>
      if (Array.isArray(data.transactions)) {
        return {
          transactions: data.transactions,
          summary:
            record.summary && typeof record.summary === "object"
              ? (record.summary as Record<string, unknown>)
              : undefined,
        }
      }
    }
  }

  return { transactions: [] }
}

function normalizeTransaction(raw: unknown): ParsedTransaction | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>

  const description =
    typeof record.description === "string"
      ? record.description.trim()
      : typeof record.merchant === "string"
        ? record.merchant.trim()
        : typeof record.title === "string"
          ? record.title.trim()
          : ""
  if (!description) return null

  const date = normalizeDate(record.date)
  if (!date) return null

  const rawAmount = normalizeAmount(record.amount ?? record.value)
  if (rawAmount === null) return null

  const explicitType =
    typeof record.type === "string" ? record.type.trim().toUpperCase() : undefined
  const type =
    explicitType === "INCOME" || explicitType === "EXPENSE" || explicitType === "TRANSFER"
      ? explicitType
      : inferType(description, rawAmount)

  return {
    date,
    description,
    amount: Math.abs(rawAmount),
    type,
    category:
      typeof record.category === "string" && record.category.trim()
        ? record.category.trim()
        : DEFAULT_CATEGORY,
    confidence:
      typeof record.confidence === "number" && Number.isFinite(record.confidence)
        ? Math.min(1, Math.max(0, record.confidence))
        : DEFAULT_CONFIDENCE,
  }
}

function buildValidatedResponse(parsed: unknown): AIParserResponse {
  const payload = extractTransactionsPayload(parsed)
  const transactions = payload.transactions
    .map(normalizeTransaction)
    .filter((transaction): transaction is ParsedTransaction => Boolean(transaction))

  const successful = transactions.filter((transaction) => transaction.confidence >= 0.7).length
  const averageConfidence =
    transactions.length > 0
      ? transactions.reduce((sum, transaction) => sum + transaction.confidence, 0) /
        transactions.length
      : 0

  return aiParserResponseSchema.parse({
    transactions,
    summary: {
      totalProcessed:
        typeof payload.summary?.totalProcessed === "number"
          ? payload.summary.totalProcessed
          : transactions.length,
      successful:
        typeof payload.summary?.successful === "number" ? payload.summary.successful : successful,
      confidence:
        typeof payload.summary?.confidence === "number"
          ? payload.summary.confidence
          : averageConfidence,
      notes:
        typeof payload.summary?.notes === "string" ? payload.summary.notes : undefined,
    },
  })
}

function extractTransactionsByRegex(dataString: string): ParsedTransaction[] {
  const normalizedText = dataString
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()

  if (!normalizedText) return []

  const transactions: ParsedTransaction[] = []
  const patterns = [
    /(\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+\d{4})\s+(.+?)\s+(-?\d[\d.]*,\d{2})(?=\s+\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+\d{4}\s+|$)/gi,
    /(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+(-?\d[\d.]*,\d{2})(?=\s+\d{2}[/-]\d{2}[/-]\d{4}\s+|$)/gi,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(normalizedText)) !== null) {
      const [, rawDate, rawDescription, rawAmount] = match
      if (!rawDate || !rawDescription || !rawAmount) continue
      const description = rawDescription.trim()
      if (
        !description ||
        /(saldo|total de entradas|total de sa[ií]das|resumo|ag[eê]ncia|conta|cpf)/i.test(
          description
        )
      ) {
        continue
      }

      const date = normalizeDate(rawDate)
      const signedAmount = normalizeAmount(rawAmount)
      if (!date || signedAmount === null) continue

      const type = inferType(description, signedAmount)
      transactions.push({
        date,
        description,
        amount: Math.abs(signedAmount),
        type,
        category: DEFAULT_CATEGORY,
        confidence: 0.55,
      })
    }

    if (transactions.length > 0) {
      break
    }
  }

  return transactions
}

/**
 * Parse bank statement text using OpenAI.
 * Falls back to regex parser if AI is unavailable.
 */
export async function parseTransactionsWithAI(
  text: string,
  _sourceType: "csv" | "pdf" | "excel" | "text" | "ocr" = "text",
  bankHint?: string,
  _existingCategories: string[] = [],
  _enablePreprocessing: boolean = true,
  _enableQualityScoring: boolean = true
): Promise<AIParserResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — falling back to regex parser")
    return parseTransactionsFallback(text)
  }

  // Limit text length to avoid token limits
  const truncated = text.slice(0, 12000)

  try {
    const OpenAI = await import("openai").then((m) => m.default)
    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(truncated, bankHint) },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error("Empty response from OpenAI")

    const parsed = JSON.parse(raw)
    const validated = buildValidatedResponse(parsed)

    console.log(`✅ AI parser: ${validated.transactions.length} transactions extracted`)
    return validated
  } catch (error) {
    console.error("AI parsing failed:", error)
    return parseTransactionsFallback(text)
  }
}

// Alias for compatibility
export const hybridParseTransactions = parseTransactionsWithAI

export function refineTransactionsWithAI(
  transactions: ParsedTransaction[]
): Promise<AIParserResponse> {
  return Promise.resolve({
    transactions,
    summary: {
      totalProcessed: transactions.length,
      successful: transactions.length,
      confidence: 0.8,
    },
  })
}

/**
 * Simple regex fallback when OpenAI is unavailable.
 */
export function parseTransactionsFallback(
  dataString: string,
  _sourceType: "csv" | "pdf" | "excel" | "text" | "ocr" = "text"
): AIParserResponse {
  const transactions: ParsedTransaction[] = []

  // Try to import bank parsers
  try {
    const { parseStatementByBank, detectBankFromText } = require("./bank-parsers")
    const bank = detectBankFromText(dataString)
    const rows = parseStatementByBank(dataString)
    if (rows.length > 0) {
      return {
        transactions: rows.map((r: any) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type as "INCOME" | "EXPENSE",
          category: "Outros",
          confidence: 0.6,
        })),
        summary: {
          totalProcessed: rows.length,
          successful: rows.length,
          confidence: 0.6,
          notes: `Fallback: banco ${bank}`,
        },
      }
    }
  } catch {}

  const regexTransactions = extractTransactionsByRegex(dataString)
  if (regexTransactions.length > 0) {
    return {
      transactions: regexTransactions,
      summary: {
        totalProcessed: regexTransactions.length,
        successful: regexTransactions.length,
        confidence: 0.55,
        notes: "Fallback por regex aplicado ao texto extraido",
      },
    }
  }

  return {
    transactions,
    summary: {
      totalProcessed: 0,
      successful: 0,
      confidence: 0,
      notes: "Nenhuma transação encontrada pelo parser fallback",
    },
  }
}
