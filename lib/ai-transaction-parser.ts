/**
 * Simple, robust transaction parser for Brazilian bank statements (Nubank).
 * Regex-based extraction + rule-based categorization. No external API calls.
 */

export interface NormalizedTransaction {
  date: string // YYYY-MM-DD
  amount: number // sempre positivo
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  description: string
  sourceFile?: string
}

/**
 * Extrai transações do texto bruto usando regex
 * Formato esperado Nubank:
 * DD/MM/YYYY Descrição da Transação -X.XXX,XX ou +X.XXX,XX
 */
function parseTransactionLines(text: string): Array<{
  date: string
  description: string
  value: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
}> {
  const transactions = []

  // Regex para capturar linhas com data, descrição e valor
  // Formato: DD/MM/YYYY espaço descrição valor
  const lineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?[\d.]+,\d{2})$/gm

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    if (match.length < 4) continue

    const dateStr = match[1]!
    const description = match[2]!
    const valueStr = match[3]!

    const date = dateStr.trim()
    const desc = description.trim()
    const value = convertBrazilianValue(valueStr.trim())
    const type = classifyTransactionType(desc)

    transactions.push({
      date,
      description: desc,
      value,
      type,
    })
  }

  return transactions
}

/**
 * Converte valor do formato brasileiro para número
 * "1.234,56" → 1234.56
 * "-1.234,56" → -1234.56
 * "+1.234,56" → 1234.56
 */
function convertBrazilianValue(valueStr: string): number {
  const isNegative = valueStr.startsWith("-") || valueStr.includes("(")
  const cleanValue = valueStr.replace(/[^\d,]/g, "").replace(",", ".")
  let num = parseFloat(cleanValue) || 0
  return isNegative ? -num : num
}

/**
 * Classifica o tipo da transação baseado na descrição
 */
function classifyTransactionType(desc: string): "INCOME" | "EXPENSE" | "TRANSFER" {
  const d = desc.toLowerCase()

  // INCOME
  if (
    d.includes("rendimento") ||
    d.includes("salario") ||
    d.includes("depósito") ||
    d.includes("crédito") ||
    d.includes("recebid")
  ) {
    return "INCOME"
  }

  // TRANSFER
  if (d.includes("transferencia") || d.includes("pix") || d.includes("ted")) {
    return "TRANSFER"
  }

  // Default: EXPENSE
  return "EXPENSE"
}

/**
 * Categoriza transação baseado em regras de keywords
 */
function categorizeTransaction(desc: string): string {
  const d = desc.toLowerCase()

  const rules: Record<string, string[]> = {
    Alimentação: [
      "ifood",
      "delivery",
      "uber eats",
      "rappi",
      "restaurante",
      "pizzaria",
      "café",
      "lanchonete",
      "padaria",
      "fast food",
    ],
    Transporte: [
      "uber",
      "taxi",
      "99",
      "combustível",
      "gasolina",
      "estacionamento",
      "metrô",
      "ônibus",
      "passagem",
    ],
    Saúde: ["farmacia", "farmácia", "drogaria", "medicamento", "médico", "hospital", "odonto"],
    Mercado: ["supermercado", "carrefour", "pão de açucar", "extra", "mercado", "atacadão"],
    Entretenimento: ["spotify", "netflix", "prime", "disney", "cinema", "ingresso", "theater"],
    Utilidades: ["energia", "água", "gás", "internet", "telefone", "tv"],
    Contas: ["boleto", "fatura", "conta", "pagamento"],
  }

  for (const [category, keywords] of Object.entries(rules)) {
    if (keywords.some((kw) => d.includes(kw))) {
      return category
    }
  }

  return "Outros"
}

/**
 * Converte data DD/MM/YYYY para YYYY-MM-DD (ISO)
 */
function convertDateToISO(dateStr: string): string {
  const [day, month, year] = dateStr.split("/")
  return `${year}-${month}-${day}`
}

/**
 * Parser principal: texto bruto → transações normalizadas
 * Sem chamadas externas, apenas regex + regras
 */
export async function parseTransactionsWithAI(
  text: string,
  _sourceType: "pdf" | "excel" | "csv" = "pdf",
  _bankHint?: string
): Promise<{ transactions: NormalizedTransaction[]; summary?: { confidence: number } }> {
  if (!text || text.trim().length < 10) {
    return { transactions: [] }
  }

  try {
    const rawTransactions = parseTransactionLines(text)

    const normalized: NormalizedTransaction[] = rawTransactions.map((tx) => {
      const category = categorizeTransaction(tx.description)
      const amount = Math.abs(tx.value)
      const date = convertDateToISO(tx.date)

      return {
        date,
        amount,
        type: tx.type,
        category,
        description: tx.description,
        sourceFile: _sourceType,
      }
    })

    return {
      transactions: normalized,
      summary: {
        confidence: normalized.length > 0 ? 0.95 : 0,
      },
    }
  } catch (error) {
    console.error("[Parser] Erro:", error instanceof Error ? error.message : String(error))
    return { transactions: [] }
  }
}

/**
 * Alias para compatibilidade com código antigo
 */
export const hybridParseTransactions = parseTransactionsWithAI

/**
 * Converter: mantém compatibilidade (já NormalizedTransaction é o formato)
 */
export function convertToNormalizedTransaction(
  tx: NormalizedTransaction,
  _fileId?: string
): NormalizedTransaction {
  return tx
}

/**
 * Legacy: função de refine
 */
export async function refineTransactionsWithAI(
  transactions: any[]
): Promise<{ transactions: NormalizedTransaction[]; summary: { confidence: number } }> {
  return {
    transactions: transactions as NormalizedTransaction[],
    summary: { confidence: 0.9 },
  }
}
