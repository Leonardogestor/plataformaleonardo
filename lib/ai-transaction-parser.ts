/**
 * AI-powered transaction parser for Brazilian bank statements.
 * Uses specialized prompt for structured extraction from Nubank and other banks.
 */

import { z } from "zod"

// Categorias permitidas conforme o prompt
const ALLOWED_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Saúde",
  "Mercado",
  "Lazer",
  "Moradia",
  "Assinaturas",
  "Transferência",
  "Investimento",
  "Outros",
]

const transactionSchema = z.object({
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  type: z.enum(["INCOME", "EXPENSE", "INVESTIMENTO"]),
  category: z.enum(ALLOWED_CATEGORIES as [string, ...string[]]),
  value: z.number(),
  description: z.string().min(1),
})

const aiParserResponseSchema = z.object({
  transactions: z.array(transactionSchema),
})

export type ParsedTransaction = z.infer<typeof transactionSchema>
export type AIParserResponse = z.infer<typeof aiParserResponseSchema>

const SYSTEM_PROMPT = `Você é um sistema especialista em parsing de extratos bancários brasileiros (especialmente Nubank).

Sua tarefa é transformar um texto bruto de extrato em uma lista estruturada de transações financeiras.

----------------------------------------
REGRAS DE EXTRAÇÃO
----------------------------------------

1. Cada transação deve conter exatamente os campos:
- date: string no formato DD/MM/YYYY
- type: "INCOME", "EXPENSE" ou "INVESTIMENTO"
- category: uma das categorias abaixo
- value: número decimal (negativo para saída, positivo para entrada)
- description: texto limpo e resumido

----------------------------------------
CLASSIFICAÇÃO DE TIPO
----------------------------------------

- "Compra no débito" → EXPENSE
- "Transferência enviada" → EXPENSE
- "Transferência recebida" → INCOME
- "Depósito" → INCOME
- "Aplicação RDB" → INVESTIMENTO
- "Resgate RDB" → INCOME
- "Pagamento de fatura" → EXPENSE
- "Estorno" → INCOME
- "Pix enviado" → EXPENSE
- "Pix recebido" → INCOME

----------------------------------------
CATEGORIAS PERMITIDAS
----------------------------------------

Escolha apenas uma das categorias abaixo (não invente):
- Alimentação
- Transporte
- Saúde
- Mercado
- Lazer
- Moradia
- Assinaturas
- Transferência
- Investimento
- Outros

----------------------------------------
REGRAS DE CATEGORIZAÇÃO
----------------------------------------

Use heurística + entendimento semântico:

- iFood, restaurante, padaria, Nutricar → Alimentação
- Drogaria, farmácia → Saúde
- Atacadão, mercado → Mercado
- Uber, 99, ônibus, petrobras → Transporte
- Spotify, Netflix, cinema → Assinaturas/Lazer
- Conta de luz, aluguel → Moradia
- PIX sem contexto específico → Transferência
- RDB, Fundo, Aplicação → Investimento

----------------------------------------
REGRAS DE LIMPEZA
----------------------------------------

- Remover prefixos como: "Compra no débito", "Transferência recebida", etc.
- Remover sufixos irrelevantes (códigos, codes CNPJ internos)
- Manter apenas o nome essencial do estabelecimento
- Limpar espaços extras

Exemplo:
"Compra no débito BELLA PORTAL PADARIA L 87,26"
→ descrição: "BELLA PORTAL PADARIA"
→ value: -87.26

----------------------------------------
REGRAS DE DATA
----------------------------------------

Datas aparecem em formatos variados:
- "01 SET 2025" → "01/09/2025"
- "01/09/2025" → "01/09/2025"
- Mapa de meses: JAN=01, FEV=02, MAR=03, ABR=04, MAI=05, JUN=06, JUL=07, AGO=08, SET=09, OUT=10, NOV=11, DEZ=12

----------------------------------------
REGRAS IMPORTANTES
----------------------------------------

- Ignore linhas como: "Total de entradas", "Total de saídas", "Saldo", "Saldo inicial", "Saldo final"
- Ignore cabeçalhos e rodapés
- Extraia apenas transações reais
- Se houver múltiplas transações na mesma linha, separe corretamente
- Nunca invente transações
- Nunca deixe campos vazios

----------------------------------------
REGRAS DE VALOR
----------------------------------------

- Valores positivos → INCOME (value > 0)
- Valores negativos → EXPENSE (value < 0)
- Converter "50,00" → 50.00
- Converter "1.234,56" → 1234.56

Se disser "+ 100,00" significa entrada (INCOME, positivo)
Se disser "- 100,00" significa saída (EXPENSE, negativo)

----------------------------------------
FORMATO DE SAÍDA (OBRIGATÓRIO)
----------------------------------------

Responda APENAS com JSON válido:

[
  {
    "date": "01/09/2025",
    "type": "EXPENSE",
    "category": "Alimentação",
    "value": -50.00,
    "description": "BELLA PORTAL PADARIA"
  },
  {
    "date": "02/09/2025",
    "type": "INCOME",
    "category": "Transferência",
    "value": 500.00,
    "description": "PIX - JOAO SILVA"
  }
]

Se nenhuma transação for encontrada, retorne: []

NUNCA retorne nada além do JSON. Não explique, não comente, apenas JSON válido.
`

function buildUserPrompt(text: string, bankHint?: string): string {
  return `${bankHint ? `Banco detectado: ${bankHint}\n\n` : ""}Texto do extrato bancário a processar:

${text}

Extraia TODAS as transações financeiras reais e retorne como JSON válido. Ignore saldos, totais e cabeçalhos.`
}

function normalizeDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null

  const trimmed = dateStr.trim().toUpperCase()

  // Já está em DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed
  }

  // Converte de DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed.replace(/-/g, "/")
  }

  // Converte de "01 SET 2025" para "01/09/2025"
  const monthMap: Record<string, string> = {
    JAN: "01",
    FEV: "02",
    MAR: "03",
    ABR: "04",
    MAI: "05",
    JUN: "06",
    JUL: "07",
    AGO: "08",
    SET: "09",
    OUT: "10",
    NOV: "11",
    DEZ: "12",
  }

  const match = trimmed.match(/^(\d{2})\s+([A-ZÇ]{3})\s+(\d{4})$/)
  if (match) {
    const [, day, monthStr, year] = match
    if (monthStr) {
      const monthNum = monthMap[monthStr as keyof typeof monthMap]
      if (monthNum) {
        return `${day}/${monthNum}/${year}`
      }
    }
  }

  return null
}

function normalizeCategory(category: string): string {
  const normalized = category.trim()

  // Se já é uma categoria válida
  if (ALLOWED_CATEGORIES.includes(normalized)) {
    return normalized
  }

  // Tenta mapear variações
  const lower = normalized.toLowerCase()

  if (
    lower.includes("alimentação") ||
    lower.includes("comida") ||
    lower.includes("restaurante") ||
    lower.includes("padaria") ||
    lower.includes("ifood")
  ) {
    return "Alimentação"
  }

  if (
    lower.includes("transporte") ||
    lower.includes("uber") ||
    lower.includes("taxi") ||
    lower.includes("99")
  ) {
    return "Transporte"
  }

  if (lower.includes("saúde") || lower.includes("farmácia") || lower.includes("med")) {
    return "Saúde"
  }

  if (lower.includes("mercado") || lower.includes("supermercado")) {
    return "Mercado"
  }

  if (lower.includes("lazer") || lower.includes("cinema") || lower.includes("filme")) {
    return "Lazer"
  }

  if (lower.includes("moradia") || lower.includes("aluguel") || lower.includes("luz")) {
    return "Moradia"
  }

  if (lower.includes("assinatura") || lower.includes("netflix") || lower.includes("spotify")) {
    return "Assinaturas"
  }

  if (lower.includes("transfer") || lower.includes("pix")) {
    return "Transferência"
  }

  if (lower.includes("invest") || lower.includes("rdb") || lower.includes("fundo")) {
    return "Investimento"
  }

  return "Outros"
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  // Detecta se é negativo
  const isNegative = /-/.test(trimmed) || trimmed.startsWith("-")
  const isPositive = /^\+|^Total de entradas/.test(trimmed)

  // Remove símbolos e normaliza
  let normalized = trimmed
    .replace(/[R$\s+]/g, "")
    .replace(/[.-](?=\d{2}$)/g, ".") // Preserva duas casas decimais
    .replace(/[.-]/g, "") // Remove pontos/hífens do milhar
    .replace(/,/g, ".") // Converte vírgula em ponto

  const parsed = parseFloat(normalized)
  if (!Number.isFinite(parsed)) return null

  // Retorna com signo correto
  if (isNegative) return -Math.abs(parsed)
  if (isPositive) return Math.abs(parsed)

  return parsed
}

export async function parseTransactionsWithAI(
  text: string,
  _sourceType: "csv" | "pdf" | "excel" | "text" | "ocr" = "text",
  bankHint?: string
): Promise<AIParserResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — returning empty response")
    return { transactions: [] }
  }

  // Limita tamanho do texto para evitar limite de tokens
  const truncated = text.slice(0, 15000)

  try {
    console.log("[AI Parser] Iniciando parsing com OpenAI...")
    const OpenAI = await import("openai").then((m) => m.default)
    const client = new OpenAI({ apiKey })

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(truncated, bankHint) },
      ],
    })

    const rawContent = response.choices[0]?.message?.content
    if (!rawContent) {
      console.warn("[AI Parser] Resposta vazia da OpenAI")
      return { transactions: [] }
    }

    console.log(`[AI Parser] Resposta recebida: ${rawContent.length} chars`)

    // Parse JSON
    const parsed = JSON.parse(rawContent)
    let transactions = Array.isArray(parsed) ? parsed : parsed.transactions || []

    // Normaliza cada transação
    const normalized = transactions
      .map((tx: any) => {
        try {
          const date = normalizeDate(tx.date)
          if (!date) {
            console.warn(`[AI Parser] Data inválida: ${tx.date}`)
            return null
          }

          const value = normalizeAmount(tx.value)
          if (value === null) {
            console.warn(`[AI Parser] Valor inválido: ${tx.value}`)
            return null
          }

          const type = (tx.type || "EXPENSE").toUpperCase()
          if (!["INCOME", "EXPENSE", "INVESTIMENTO"].includes(type)) {
            console.warn(`[AI Parser] Tipo inválido: ${type}`)
            return null
          }

          return {
            date,
            type: type as "INCOME" | "EXPENSE" | "INVESTIMENTO",
            category: normalizeCategory(tx.category || "Outros"),
            value,
            description: (tx.description || "").trim(),
          }
        } catch (e) {
          console.warn(`[AI Parser] Erro ao normalizar transação:`, e)
          return null
        }
      })
      .filter((tx: any) => tx !== null)

    // Valida com Zod
    const validated = z.array(transactionSchema).parse(normalized)

    console.log(`✅ [AI Parser] ${validated.length} transações extraídas com sucesso`)
    return { transactions: validated }
  } catch (error) {
    console.error(`❌ [AI Parser] Erro:`, error instanceof Error ? error.message : String(error))
    return { transactions: [] }
  }
}

/**
 * Converte ParsedTransaction (novo formato) para NormalizedTransaction (compatível com importação)
 */
export function convertToNormalizedTransaction(
  tx: ParsedTransaction,
  documentId?: string | null
): {
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  subcategory: null
  amount: number
  description: string
  date: string // ISO date YYYY-MM-DD
  documentId: string | null | undefined
} {
  // Converte data de DD/MM/YYYY para YYYY-MM-DD (ISO)
  const [day, month, year] = tx.date.split("/")
  const isoDate = `${year}-${month}-${day}`

  // Mapeia type: INVESTIMENTO → TRANSFER (por enquanto)
  let mappedType: "INCOME" | "EXPENSE" | "TRANSFER" = "EXPENSE"
  if (tx.type === "INCOME") {
    mappedType = "INCOME"
  } else if (tx.type === "INVESTIMENTO") {
    mappedType = "TRANSFER" // Ou EXPENSE, dependendo da regra
  }

  return {
    type: mappedType,
    category: tx.category,
    subcategory: null,
    amount: Math.abs(tx.value), // Sempre positivo
    description: tx.description,
    date: isoDate,
    documentId,
  }
}

// Alias para compatibilidade
export const hybridParseTransactions = parseTransactionsWithAI

/**
 * Refina transações (compatibilidade com código legado)
 * Retorna as transações normalizadas
 */
export function refineTransactionsWithAI(
  transactions: any[]
): Promise<{
  transactions: ParsedTransaction[]
  summary: { confidence: number }
}> {
  // Converte transações legadas para ParsedTransaction
  const converted = transactions
    .filter((t) => t.type === "INCOME" || t.type === "EXPENSE")
    .map((t) => {
      const [year, month, day] = t.date.split("-")
      return {
        date: `${day}/${month}/${year}`,
        type: t.type as "INCOME" | "EXPENSE",
        category: t.category || "Outros",
        value: t.type === "INCOME" ? Math.abs(t.amount) : -Math.abs(t.amount),
        description: t.description,
      }
    })

  return Promise.resolve({
    transactions: converted,
    summary: { confidence: 0.8 },
  })
}
