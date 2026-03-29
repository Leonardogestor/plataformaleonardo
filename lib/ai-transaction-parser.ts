/**
 * AI-powered transaction parser for unstructured financial data
 * Temporarily simplified for deployment
 */

import { z } from "zod"

// Schema for structured output
const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().min(1, "Description cannot be empty"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string().min(1, "Category cannot be empty"),
  confidence: z.number().min(0).max(1), // Confidence score
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

// Additional exports for compatibility
export function hybridParseTransactions(
  dataString: string,
  sourceType: "csv" | "pdf" | "excel" | "text" | "ocr" = "text"
): Promise<AIParserResponse> {
  return parseTransactionsWithAI(dataString, sourceType)
}

export function refineTransactionsWithAI(
  transactions: ParsedTransaction[]
): Promise<AIParserResponse> {
  return Promise.resolve({
    transactions,
    summary: {
      totalProcessed: transactions.length,
      successful: transactions.length,
      confidence: 0.8,
      notes: "Refined with AI (temporarily disabled)",
    },
  })
}

/**
 * Parse transactions using AI (temporarily disabled)
 */
export async function parseTransactionsWithAI(
  dataString: string,
  sourceType: "csv" | "pdf" | "excel" | "text" | "ocr" = "text",
  bankHint?: string,
  existingCategories: string[] = [],
  enablePreprocessing: boolean = true,
  enableQualityScoring: boolean = true
): Promise<AIParserResponse> {
  // Return empty response for now - AI functionality temporarily disabled
  return {
    transactions: [],
    summary: {
      totalProcessed: 0,
      successful: 0,
      confidence: 0,
      notes: "AI functionality temporarily disabled for deployment",
    },
  }
}

/**
 * Simple fallback parser for basic transaction extraction
 */
export function parseTransactionsFallback(
  dataString: string,
  sourceType: "csv" | "pdf" | "excel" | "text" | "ocr" = "text"
): AIParserResponse {
  const lines = dataString.split("\n").filter((line) => line.trim())
  const transactions: ParsedTransaction[] = []

  // Simple regex-based parsing for common formats
  for (const line of lines) {
    // Try to match common transaction patterns
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/)
    const amountMatch = line.match(/R?\$?\s*(\d+[.,]\d{2})/)

    if (dateMatch && amountMatch) {
      const date = dateMatch[0].includes("/")
        ? dateMatch[0].split("/").reverse().join("-")
        : dateMatch[0]

      const amount = parseFloat(amountMatch[1]?.replace(",", ".") || "0")
      const description = line
        .replace(dateMatch[0] || "", "")
        .replace(amountMatch[0] || "", "")
        .trim()

      transactions.push({
        date,
        description: description || "Transação",
        amount,
        type: amount > 0 ? "EXPENSE" : "INCOME",
        category: "Outros",
        confidence: 0.5,
      })
    }
  }

  return {
    transactions,
    summary: {
      totalProcessed: transactions.length,
      successful: transactions.length,
      confidence: transactions.length > 0 ? 0.5 : 0,
      notes: "Parsed using fallback method",
    },
  }
}
