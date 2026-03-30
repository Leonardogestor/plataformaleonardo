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
  try {
    // Import OpenAI dynamically
    const OpenAI = await import("openai").then((mod) => mod.default)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Preprocess data if enabled
    let processedData = dataString
    if (enablePreprocessing) {
      processedData = preprocessData(dataString, sourceType)
    }

    // Create prompt for transaction extraction
    const prompt = createTransactionExtractionPrompt(
      processedData,
      sourceType,
      bankHint,
      existingCategories
    )

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      temperature: parseFloat(process.env.AI_TEMPERATURE || "0.1"),
      messages: [
        {
          role: "system",
          content:
            "Você é um especialista em extrair dados financeiros de documentos bancários. Extraia transações com precisão e retorne no formato JSON especificado.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from AI")
    }

    // Parse and validate response
    const parsed = JSON.parse(response)
    const validated = aiParserResponseSchema.parse(parsed)

    // Apply quality scoring if enabled
    if (enableQualityScoring) {
      validated.transactions = validated.transactions.map((tx) => ({
        ...tx,
        confidence: calculateConfidenceScore(tx, processedData),
      }))
    }

    return validated
  } catch (error: any) {
    console.error("AI parsing failed:", error)

    // Fallback to basic parsing
    return parseTransactionsFallback(dataString, sourceType)
  }
}

// Helper functions
function preprocessData(dataString: string, sourceType: string): string {
  // Clean and normalize data based on source type
  return dataString
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,-\/]/g, "")
    .trim()
}

function createTransactionExtractionPrompt(
  data: string,
  sourceType: string,
  bankHint?: string,
  existingCategories: string[] = []
): string {
  return `
Extraia as transações do seguinte conteúdo de ${sourceType}:

${data}

${bankHint ? `Dica: Este documento parece ser do banco: ${bankHint}` : ""}

${existingCategories.length > 0 ? `Categorias existentes: ${existingCategories.join(", ")}` : ""}

Retorne um JSON com esta estrutura:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descrição da transação",
      "amount": 123.45,
      "type": "INCOME" | "EXPENSE" | "TRANSFER",
      "category": "categoria",
      "confidence": 0.95
    }
  ],
  "summary": {
    "totalProcessed": número,
    "successful": número,
    "confidence": 0.90,
    "notes": "observações"
  }
}

Regras:
- Datas devem estar no formato YYYY-MM-DD
- Valores devem ser números positivos
- INCOME para receitas, EXPENSE para despesas, TRANSFER para transferências
- Seja preciso com valores e descrições
  `
}

function calculateConfidenceScore(transaction: any, originalData: string): number {
  // Simple confidence calculation based on data quality
  let score = 0.5

  // Check if description exists in original data
  if (originalData.toLowerCase().includes(transaction.description.toLowerCase())) {
    score += 0.2
  }

  // Check date format
  if (/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
    score += 0.15
  }

  // Check amount is reasonable
  if (transaction.amount > 0 && transaction.amount < 1000000) {
    score += 0.15
  }

  return Math.min(score, 1.0)
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
