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
  type: z.enum(["INCOME", "EXPENSE"]),
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

const SYSTEM_PROMPT = `Você é um especialista em extrair transações de extratos bancários brasileiros.
Sua tarefa é analisar o texto de um extrato e retornar TODAS as transações individuais em JSON estruturado.

REGRAS:
- Ignore cabeçalhos, rodapés, totais diários (ex: "Total de entradas + 917,77"), saldos e resumos
- Capture APENAS transações individuais com valor próprio
- type: "INCOME" para entradas (recebimento, transferência recebida, estorno, resgate RDB, reembolso)
- type: "EXPENSE" para saídas (compra, transferência enviada, pagamento de fatura, aplicação RDB, Pix enviado)
- Transferências entre contas próprias: use "EXPENSE" para saída e "INCOME" para entrada
- Datas no extrato Nubank aparecem como "01 SET 2025", "04 JAN 2026" etc — converta para YYYY-MM-DD
- A data de cada transação é a data do dia em que ela aparece no extrato
- amount: sempre positivo (número), nunca negativo
- Valores no formato brasileiro: "1.234,56" → 1234.56
- description: combine o tipo da transação com a descrição do beneficiário/estabelecimento
- category: classifique em uma das categorias: Alimentação, Transporte, Saúde, Moradia, Lazer, Educação, Vestuário, Supermercado, Farmácia, Investimento, Renda, Transferência, Outros`

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
    const validated = aiParserResponseSchema.parse(parsed)

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
  const lines = dataString.split("\n").filter((l) => l.trim())
  const transactions: ParsedTransaction[] = []

  const monthMap: Record<string, string> = {
    JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
    JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
  }

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
