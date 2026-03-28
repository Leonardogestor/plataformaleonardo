/**
 * AI-powered transaction parser for unstructured financial data
 * Acts as intelligent fallback and refinement for existing parsers
 */

import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

// Schema for structured output with quality scoring
const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().min(1, "Description cannot be empty"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  category: z.string().min(1, "Category cannot be empty"),
  confidence: z.number().min(0).max(1), // Confidence score
  quality_score: z.number().min(0).max(1), // Quality score
})

const aiParserResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  summary: z.object({
    totalProcessed: z.number(),
    successful: z.number(),
    confidence: z.number().min(0).max(1),
    quality: z.number().min(0).max(1),
    notes: z.string().optional(),
  }),
})

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  confidence: number
  quality_score: number
}

export interface AIParserResult {
  transactions: ParsedTransaction[]
  summary: {
    totalProcessed: number
    successful: number
    confidence: number
    quality: number
    notes?: string
  }
}

/**
 * Enhanced preprocessing with intelligent line filtering
 */
function preprocessText(text: string): string {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      // Remove irrelevant lines
      .filter((line) => {
        // Remove very short lines
        if (line.length < 5) return false

        // Remove common headers/titles
        const upperLine = line.toUpperCase()
        const irrelevantPatterns = [
          "EXTRATO",
          "SALDO",
          "TOTAL",
          "RESUMO",
          "CONTA",
          "AGÊNCIA",
          "BANCO",
          "DATA",
          "HISTÓRICO",
          "VALOR",
          "CRÉDITO",
          "DÉBITO",
          "LANÇAMENTO",
          "PERÍODO",
          "PÁGINA",
          "CLIENTE",
        ]

        if (irrelevantPatterns.some((pattern) => upperLine.includes(pattern)) && line.length < 30) {
          return false
        }

        // Keep lines that might contain transactions
        return true
      })
      .slice(0, 300) // Limit to avoid excessive costs
      .map((line, index) => `${index + 1}: ${line}`) // Number lines for reference
      .join("\n")
  )
}

/**
 * Enhanced OCR error correction with contextual validation
 */
function correctOCRErrors(text: string): string {
  return (
    text
      // Common character substitutions (only when contextually appropriate)
      .replace(/(\d)S/g, "$15") // 1S -> 15, 2S -> 25, etc.
      .replace(/l(\d)/g, "1$1") // l5 -> 15, l2 -> 12
      .replace(/O(\d)/g, "0$1") // O5 -> 05
      // Number format corrections
      .replace(/(\d),(\d{2})\D/g, "$1.$2") // 1,23 -> 1.23
      .replace(/(\d)\.(\d{3}),(\d{2})/g, "$1$2.$3") // 1.234,56 -> 1234.56
      .replace(/(\d)\.(\d{3})\.(\d{3}),(\d{2})/g, "$1$2$3.$4") // 1.234.567,89 -> 1234567.89
      // Common word corrections (contextual)
      .replace(/SUPERMERCAD0/g, "SUPERMERCADO")
      .replace(/SAI\.AR|SAL\.AR|SALARI0/g, "SALARIO")
      .replace(/FARMACIA|DR0GARIA/g, "FARMACIA")
      .replace(/U6ER|UB3R/g, "UBER")
      .replace(/NETFLIX|NETFLLX/g, "NETFLIX")
      .replace(/SPOTIFY|SPOTLFLY/g, "SPOTIFY")
      // Date corrections
      .replace(/l5\/(\d{2})\/(\d{4})/g, "15/$1/$2")
      .replace(/(\d{2})\/(\d{2})\/2(\d{3})/g, "$1/$2/20$3") // 15/03/024 -> 15/03/2024
      // Multiple spaces to single space
      .replace(/\s+/g, " ")
      .trim()
  )
}

/**
 * Enhanced confidence calculation with quality assessment
 */
function calculateConfidenceAndQuality(transaction: any): { confidence: number; quality: number } {
  let confidence = 0
  let quality = 0

  // Confidence scoring (0.25 + 0.25 + 0.20 + 0.15 + 0.15)
  // Date validation (0.25 points)
  if (transaction.date && /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
    const date = new Date(transaction.date)
    const now = new Date()
    // Check if date is reasonable (not too far in future or past)
    if (date <= now && date >= new Date(now.getFullYear() - 10)) {
      confidence += 0.25
      quality += 0.25
    } else {
      confidence += 0.15 // Reduced confidence for questionable dates
      quality += 0.1
    }
  }

  // Amount validation (0.25 points)
  if (transaction.amount && typeof transaction.amount === "number" && transaction.amount > 0) {
    // Check if amount is reasonable (not too extreme)
    if (transaction.amount < 1000000) {
      // Less than 1M
      confidence += 0.25
      quality += 0.25
    } else {
      confidence += 0.15
      quality += 0.1
    }
  }

  // Description coherence (0.20 points)
  if (
    transaction.description &&
    transaction.description.length > 3 &&
    transaction.description.length < 500 &&
    !/^\d+$/.test(transaction.description)
  ) {
    // Check for generic/truncated descriptions
    const desc = transaction.description.toLowerCase()
    const genericPatterns = ["abc", "xyz", "teste", "transacao", "lancto"]
    const isGeneric = genericPatterns.some((pattern) => desc.includes(pattern))

    if (!isGeneric && transaction.description.length > 5) {
      confidence += 0.2
      quality += 0.2
    } else {
      confidence += 0.1
      quality += 0.05
    }
  }

  // Type consistency with amount (0.15 points)
  if (transaction.type && ["INCOME", "EXPENSE", "TRANSFER"].includes(transaction.type)) {
    // Check consistency between type and description
    const desc = transaction.description.toLowerCase()
    let consistent = true

    if (
      transaction.type === "INCOME" &&
      (desc.includes("pagamento") || desc.includes("compra") || desc.includes("debito"))
    ) {
      consistent = false
    }
    if (
      transaction.type === "EXPENSE" &&
      (desc.includes("recebido") || desc.includes("salario") || desc.includes("credito"))
    ) {
      consistent = false
    }

    if (consistent) {
      confidence += 0.15
      quality += 0.15
    } else {
      confidence += 0.05
      quality += 0.05
    }
  }

  // Category plausibility (0.15 points)
  if (transaction.category && transaction.category.length > 2 && transaction.category.length < 50) {
    // Check if category makes sense with description
    const desc = transaction.description.toLowerCase()
    const cat = transaction.category.toLowerCase()
    let plausible = true

    if (
      cat === "alimentação" &&
      !desc.includes("mercado") &&
      !desc.includes("restaurante") &&
      !desc.includes("lanche")
    ) {
      plausible = false
    }
    if (
      cat === "transporte" &&
      !desc.includes("uber") &&
      !desc.includes("taxi") &&
      !desc.includes("combustivel")
    ) {
      plausible = false
    }

    if (plausible) {
      confidence += 0.15
      quality += 0.15
    } else {
      confidence += 0.05
      quality += 0.05
    }
  }

  // Apply conservative limits
  confidence = Math.min(confidence, 0.95)
  quality = Math.min(quality, 0.95)

  return { confidence, quality }
}

/**
 * Enhanced AI parsing with comprehensive validation
 */
export async function parseTransactionsWithAI(
  rawData: string | any[] | Record<string, any>,
  options: {
    sourceType?: "pdf" | "excel" | "csv" | "text"
    bankHint?: string
    existingCategories?: string[]
    enableOCRCorrection?: boolean
    enablePreprocessing?: boolean
    enableQualityScoring?: boolean
  } = {}
): Promise<AIParserResult> {
  const {
    sourceType = "text",
    bankHint = "",
    existingCategories = [],
    enableOCRCorrection = true,
    enablePreprocessing = true,
    enableQualityScoring = true,
  } = options

  // Prepare and preprocess data
  let dataString = typeof rawData === "string" ? rawData : JSON.stringify(rawData, null, 2)

  // Apply OCR correction if enabled
  if (enableOCRCorrection) {
    dataString = correctOCRErrors(dataString)
  }

  // Apply preprocessing if enabled
  if (enablePreprocessing) {
    dataString = preprocessText(dataString)
  }

  // Build comprehensive context for the AI
  const context = buildComprehensiveContext(dataString, sourceType, bankHint, existingCategories)

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: context,
      schema: aiParserResponseSchema,
      temperature: 0.1, // Low temperature for consistency
      maxTokens: 4000,
    })

    // Calculate confidence and quality scores for each transaction
    const transactionsWithScores = object.transactions.map((transaction) => {
      const scores = enableQualityScoring
        ? calculateConfidenceAndQuality(transaction)
        : { confidence: transaction.confidence || 0.5, quality: 0.5 }

      return {
        ...transaction,
        confidence: scores.confidence,
        quality_score: scores.quality,
      }
    })

    // Calculate overall confidence and quality
    const overallConfidence =
      transactionsWithScores.length > 0
        ? transactionsWithScores.reduce((sum, t) => sum + t.confidence, 0) /
          transactionsWithScores.length
        : 0

    const overallQuality =
      transactionsWithScores.length > 0
        ? transactionsWithScores.reduce((sum, t) => sum + t.quality_score, 0) /
          transactionsWithScores.length
        : 0

    return {
      transactions: transactionsWithScores,
      summary: {
        ...object.summary,
        confidence: overallConfidence,
        quality: overallQuality,
      },
    }
  } catch (error) {
    console.error("AI parsing failed:", error)
    // Return empty result on failure
    return {
      transactions: [],
      summary: {
        totalProcessed: 0,
        successful: 0,
        confidence: 0,
        quality: 0,
        notes: `AI parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    }
  }
}

/**
 * Build comprehensive context with all validation rules
 */
function buildComprehensiveContext(
  dataString: string,
  sourceType: string,
  bankHint: string,
  existingCategories: string[]
): string {
  const categoriesList =
    existingCategories.length > 0
      ? existingCategories.join(", ")
      : "ALIMENTAÇÃO, TRANSPORTE, ENTRETENIMENTO, SAÚDE, EDUCAÇÃO, MORADIA, DROGARIA, VESTUÁRIO, SERVIÇOS, IMPOSTOS, OUTROS"

  return `Você receberá dados financeiros extraídos de documentos (PDF, OCR, Excel, CSV ou texto bruto).

Os dados podem conter:
- erros de OCR (ex: "1S/03/2024", "5.0OO,OO")
- linhas irrelevantes (títulos, saldos, rodapés)
- múltiplos formatos misturados
- estruturas inconsistentes

Seu objetivo é interpretar, limpar e estruturar esses dados com máxima precisão.

---

### CONTEXTO ADICIONAL

**Tipo de fonte:** ${sourceType}
${bankHint ? `**Banco identificado:** ${bankHint}` : ""}
**Categorias conhecidas:** ${categoriesList}
**OCR Correction:** ATIVADO
**Preprocessing:** ATIVADO
**Quality Scoring:** ATIVADO

---

### 1. PRÉ-ESTRUTURAÇÃO INTELIGENTE

Antes de interpretar:

- Separe o conteúdo em linhas individuais
- Remova linhas irrelevantes:
  - títulos (ex: "EXTRATO", "SALDO")
  - cabeçalhos genéricos
  - linhas muito curtas (<5 caracteres)
- Identifique linhas que representam transações

Uma linha válida geralmente contém:
- uma data
- um valor numérico

Se uma transação estiver quebrada em múltiplas linhas:
→ combine corretamente

---

### 2. CORREÇÃO DE OCR (CONTEXTUAL)

Corrija erros apenas quando fizer sentido no contexto.

#### Para números e datas:
- "1S/03/2024" → "15/03/2024"
- "5.0OO,OO" → "5000,00"
- "l25,5O" → "125,50"

#### Para palavras:
- "SUPERMERCAD0" → "SUPERMERCADO"
- "SAI.AR|O" → "SALARIO"

IMPORTANTE:
- NÃO aplicar substituições cegas
- Só corrigir quando houver forte evidência
- Preserve palavras válidas

---

### 3. IDENTIFICAÇÃO DE CAMPOS

Para cada transação, identificar:

- date
- description
- amount
- type
- category

NÃO confiar em nomes de coluna.
Usar contexto da linha.

---

### 4. NORMALIZAÇÃO

#### Datas:
Converter qualquer formato para:
YYYY-MM-DD

#### Valores:
Aceitar:
- 1.234,56
- 1234.56
- 74,9

Converter para:
1234.56 (float positivo)

---

### 5. INFERÊNCIA DE TIPO

Se não explícito:

- valor negativo → EXPENSE
- valor positivo → INCOME

Baseado na descrição:
- "pix", "ted", "transferencia" → TRANSFER
- "salario", "credito" → INCOME
- "compra", "debito", "pagamento" → EXPENSE

---

### 6. CATEGORIZAÇÃO

Inferir categoria:

- supermercado → ALIMENTAÇÃO
- uber / 99 → TRANSPORTE
- farmacia → SAÚDE
- streaming → ENTRETENIMENTO

Se incerto:
→ "Outros"

---

### 7. VALIDAÇÃO DE LINHA

Uma transação válida deve ter:
- data plausível
- valor numérico
- descrição relevante (não genérica tipo "ABC XYZ")

Se não atender:
→ descartar

---

### 8. CONFIDENCE SCORE (REAL)

Calcular de 0 a 1:

- data válida → +0.25
- valor válido → +0.25
- descrição clara → +0.20
- tipo consistente → +0.15
- categoria coerente → +0.15

Regras:
- máximo: 0.95
- reduzir se houver ambiguidade
- ser conservador

---

### 9. QUALITY SCORE (CRÍTICO)

Avaliar qualidade geral da transação:

Reduzir score se:
- descrição genérica ou truncada
- valor fora do padrão esperado
- inconsistência entre tipo e valor
- suspeita de erro de OCR não resolvido

Adicionar campo:
"quality_score": 0 a 1

---

### 10. CONSISTÊNCIA GLOBAL

Antes de finalizar:

- verificar se datas fazem sentido (não futuras absurdas)
- verificar padrão do documento
- manter consistência entre transações

---

### 11. SAÍDA (OBRIGATÓRIA)

Retornar apenas JSON:

[
  {
    "date": "YYYY-MM-DD",
    "description": "string",
    "amount": 123.45,
    "type": "INCOME | EXPENSE | TRANSFER",
    "category": "string",
    "confidence": 0.0,
    "quality_score": 0.0
  }
]

---

### 12. COMPORTAMENTO

- Ser tolerante a erros
- Corrigir quando possível
- NÃO inventar dados
- Priorizar consistência sobre quantidade
- Em dúvida → reduzir confiança

---

### DADOS PARA PROCESSAR

${dataString}

---

### INSTRUÇÕES FINAIS

Processe os dados acima seguindo todas as regras estabelecidas.
Retorne apenas o resultado estruturado no formato solicitado.
Inclua campos "confidence" e "quality_score" reais para cada transação.
Seja extremamente cuidadoso na validação e consistência.
`
}

/**
 * Enhanced hybrid parser with quality-based AI usage
 */
export async function hybridParseTransactions(
  rawData: string,
  traditionalParser: () => any[],
  options: {
    sourceType?: "pdf" | "excel" | "csv" | "text"
    bankHint?: string
    existingCategories?: string[]
    minConfidence?: number
    minQuality?: number
    enableOCRCorrection?: boolean
    enablePreprocessing?: boolean
    enableQualityScoring?: boolean
  } = {}
): Promise<AIParserResult> {
  const {
    minConfidence = 0.8,
    minQuality = 0.7,
    enableOCRCorrection = true,
    enablePreprocessing = true,
    enableQualityScoring = true,
  } = options

  try {
    // Try traditional parser first
    const traditionalResult = traditionalParser()

    // Calculate confidence and quality for traditional results
    const traditionalWithScores = traditionalResult.map((t) => {
      const scores = enableQualityScoring
        ? calculateConfidenceAndQuality(t)
        : { confidence: 0.8, quality: 0.7 }

      return {
        ...t,
        confidence: scores.confidence,
        quality_score: scores.quality,
      }
    })

    const avgConfidence =
      traditionalWithScores.length > 0
        ? traditionalWithScores.reduce((sum, t) => sum + t.confidence, 0) /
          traditionalWithScores.length
        : 0

    const avgQuality =
      traditionalWithScores.length > 0
        ? traditionalWithScores.reduce((sum, t) => sum + t.quality_score, 0) /
          traditionalWithScores.length
        : 0

    // If traditional parser works well, use it
    if (
      traditionalResult.length > 0 &&
      avgConfidence >= minConfidence &&
      avgQuality >= minQuality
    ) {
      return {
        transactions: traditionalWithScores,
        summary: {
          totalProcessed: traditionalResult.length,
          successful: traditionalResult.length,
          confidence: avgConfidence,
          quality: avgQuality,
          notes: "Processed with traditional parser (high confidence and quality)",
        },
      }
    }
  } catch (error) {
    console.warn("Traditional parser failed, falling back to AI:", error)
  }

  // Fallback to AI parsing with enhanced features
  return parseTransactionsWithAI(rawData, {
    ...options,
    enableOCRCorrection,
    enablePreprocessing,
    enableQualityScoring,
  })
}

/**
 * Refine existing transactions with enhanced quality assessment
 */
export async function refineTransactionsWithAI(
  transactions: ParsedTransaction[],
  options: {
    existingCategories?: string[]
    improveCategories?: boolean
    improveTypes?: boolean
    enableOCRCorrection?: boolean
    enableQualityScoring?: boolean
  } = {}
): Promise<AIParserResult> {
  const {
    existingCategories = [],
    improveCategories = true,
    improveTypes = true,
    enableOCRCorrection = true,
    enableQualityScoring = true,
  } = options

  const prompt = `Analise e refine as seguintes transações financeiras:

${JSON.stringify(transactions, null, 2)}

REGRAS:
${improveCategories ? "- Melhore as categorias quando possível" : "- Mantenha as categorias existentes"}
${improveTypes ? "- Verifique e corrija os tipos (INCOME/EXPENSE/TRANSFER)" : "- Mantenha os tipos existentes"}
- Mantenha datas, valores e descrições originais
- Use categorias conhecidas: ${existingCategories.join(", ") || "ALIMENTAÇÃO, TRANSPORTE, ENTRETENIMENTO, SAÚDE, EDUCAÇÃO, MORADIA, DROGARIA, VESTUÁRIO, SERVIÇOS, IMPOSTOS, OUTROS"}
- Calcule confidence e quality scores realistas para cada transação
- Seja extremamente conservador nas avaliações
- Verifique consistência entre todos os campos

Retorne no mesmo formato JSON com as transações refinadas e scores atualizados.`

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt,
      schema: aiParserResponseSchema,
      temperature: 0.1,
    })

    return object
  } catch (error) {
    console.error("AI refinement failed:", error)
    return {
      transactions,
      summary: {
        totalProcessed: transactions.length,
        successful: transactions.length,
        confidence: 0.5,
        quality: 0.5,
        notes: "Refinement failed, using original transactions",
      },
    }
  }
}
