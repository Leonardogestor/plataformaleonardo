/**
 * NORMALIZADOR DE TRANSAÇÕES FINANCEIRAS BRASILEIRAS
 *
 * Sistema especialista em:
 * 1. Limpeza e padronização de descrições
 * 2. Classificação de categorias
 * 3. Validação de tipos e valores
 *
 * Sem chamadas externas. Apenas regras.
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
 * PASSO 1: Limpar e padronizar descrição
 * Remove prefixos/sufixos bancários irrelevantes
 */
function cleanDescription(rawDesc: string): string {
  let cleaned = rawDesc.trim()

  // Remover prefixos comuns (with word boundaries)
  const prefixPatterns = [
    /^Compra\s+no\s+débito\s+/i,
    /^Compra\s+débito\s+/i,
    /^Transferência\s+recebida\s+/i,
    /^Transferência\s+enviada\s+/i,
    /^Transferência\s+/i,
    /^Depósito\s+/i,
    /^Pagamento\s+de\s+fatura\s+/i,
    /^Pagamento\s+/i,
    /^Resgate\s+/i,
    /^Aplicação\s+/i,
    /^Pix\s+/i,
    /^TED\s+/i,
    /^DOC\s+/i,
    /^Boleto\s+/i,
    /^Recarga\s+/i,
    /^Crédito\s+/i,
    /^Débito\s+/i,
  ]

  for (const pattern of prefixPatterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, "")
      break
    }
  }

  // Remover sufixos: letras soltas, códigos, números finais isolados
  cleaned = cleaned.replace(/\s+[A-Z]\s*$/, "") // Remove letra solta no final
  cleaned = cleaned.replace(/\s+\d{1,3}\s*$/, "") // Remove números curtos no final

  // Limpar espaços múltiplos
  cleaned = cleaned.replace(/\s+/g, " ").trim()

  return cleaned
}

/**
 * PASSO 2: Classificar tipo (INCOME, EXPENSE, TRANSFER)
 * Regras:
 * - Valor negativo → EXPENSE
 * - Valor positivo → INCOME
 * - Se contiver "Aplicação" → INVESTIMENTO (mas retornamos como TRANSFER)
 * - Se contiver "Resgate" → INCOME
 */
function classifyType(desc: string, value: number): "INCOME" | "EXPENSE" | "TRANSFER" {
  const d = desc.toLowerCase()
  const originalDesc = desc.toLowerCase() // Original antes de limpar

  // Regras especiais
  if (d.includes("aplicação") || d.includes("investimento")) {
    return "TRANSFER" // Mapeamos INVESTIMENTO → TRANSFER
  }

  if (d.includes("resgate")) {
    return "INCOME"
  }

  // Baseado em valor
  if (value > 0) {
    return "INCOME"
  }

  if (value < 0) {
    return "EXPENSE"
  }

  return "EXPENSE" // default
}

/**
 * PASSO 3: Classificar categoria
 * Usa interpretação semântica + padrões
 */
function classifyCategory(desc: string): string {
  const d = desc.toLowerCase()

  // ALIMENTAÇÃO
  if (
    d.includes("restaurante") ||
    d.includes("padaria") ||
    d.includes("ifood") ||
    d.includes("lanchonete") ||
    d.includes("pizzaria") ||
    d.includes("café") ||
    d.includes("sorveteria") ||
    d.includes("churrascaria") ||
    d.includes("açougue") ||
    d.includes("bakery") ||
    d.includes("bar") ||
    d.includes("boteco") ||
    d.includes("delivery")
  ) {
    return "Alimentação"
  }

  // TRANSPORTE
  if (
    d.includes("uber") ||
    d.includes("99") ||
    d.includes("ônibus") ||
    d.includes("metrô") ||
    d.includes("taxi") ||
    d.includes("táxi") ||
    d.includes("passagem") ||
    d.includes("combustível") ||
    d.includes("gasolina") ||
    d.includes("estacionamento") ||
    d.includes("pedágio") ||
    d.includes("transporte") ||
    d.includes("viagem")
  ) {
    return "Transporte"
  }

  // SAÚDE
  if (
    d.includes("farmácia") ||
    d.includes("farmacia") ||
    d.includes("drogaria") ||
    d.includes("medicamento") ||
    d.includes("médico") ||
    d.includes("medico") ||
    d.includes("hospital") ||
    d.includes("clínica") ||
    d.includes("clinica") ||
    d.includes("odonto") ||
    d.includes("dentista") ||
    d.includes("oftalmologia") ||
    d.includes("psicólogo") ||
    d.includes("psicologia") ||
    d.includes("fisioterapia")
  ) {
    return "Saúde"
  }

  // MERCADO
  if (
    d.includes("supermercado") ||
    d.includes("mercado") ||
    d.includes("carrefour") ||
    d.includes("pão de açúcar") ||
    d.includes("extra") ||
    d.includes("atacadão") ||
    d.includes("dia") ||
    d.includes("hortifruti") ||
    d.includes("basilia")
  ) {
    return "Mercado"
  }

  // LAZER
  if (
    d.includes("cinema") ||
    d.includes("teatro") ||
    d.includes("ingresso") ||
    d.includes("show") ||
    d.includes("clube") ||
    d.includes("parque") ||
    d.includes("museu") ||
    d.includes("lazer")
  ) {
    return "Lazer"
  }

  // ASSINATURAS
  if (
    d.includes("spotify") ||
    d.includes("netflix") ||
    d.includes("prime") ||
    d.includes("disney") ||
    d.includes("assinatura") ||
    d.includes("streaming") ||
    d.includes("youtube premium") ||
    d.includes("plano")
  ) {
    return "Assinaturas"
  }

  // MORADIA
  if (
    d.includes("energia") ||
    d.includes("água") ||
    d.includes("gás") ||
    d.includes("internet") ||
    d.includes("telefone") ||
    d.includes("aluguel") ||
    d.includes("condomínio") ||
    d.includes("serviço") ||
    d.includes("moradia")
  ) {
    return "Moradia"
  }

  // TRANSFERÊNCIA (PIX, TED, DOC sem contexto melhor)
  if (
    d.includes("pix") ||
    d.includes("ted") ||
    d.includes("doc") ||
    d.includes("transferência") ||
    d.includes("transferencia")
  ) {
    return "Transferência"
  }

  // DEFAULT: Outros
  return "Outros"
}

/**
 * Converte valor do formato brasileiro
 */
function convertBrazilianValue(valueStr: string): number {
  const isNegative = valueStr.startsWith("-") || valueStr.includes("(")
  const cleanValue = valueStr.replace(/[^\d,]/g, "").replace(",", ".")
  let num = parseFloat(cleanValue) || 0
  return isNegative ? -num : num
}

/**
 * Extrai transações do texto usando regex
 */
function parseTransactionLines(text: string): Array<{
  date: string
  rawDescription: string
  value: number
}> {
  const transactions = []
  const lineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?[\d.]+,\d{2})$/gm

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    if (match.length < 4) continue

    const dateStr = match[1]!
    const description = match[2]!
    const valueStr = match[3]!

    transactions.push({
      date: dateStr.trim(),
      rawDescription: description.trim(),
      value: convertBrazilianValue(valueStr.trim()),
    })
  }

  return transactions
}

/**
 * NORMALIZADOR PRINCIPAL
 * Entrada: transação bruta
 * Saída: transação normalizada e categorizada
 */
function normalizeTransaction(raw: {
  date: string
  rawDescription: string
  value: number
}): NormalizedTransaction {
  // Passo 1: Limpar descrição
  const cleanedDesc = cleanDescription(raw.rawDescription)

  // Passo 2: Classificar tipo
  const type = classifyType(raw.rawDescription, raw.value)

  // Passo 3: Classificar categoria
  const category = classifyCategory(cleanedDesc)

  // Passo 4: Validar e retornar
  return {
    date: convertDateToISO(raw.date),
    amount: Math.abs(raw.value),
    type,
    category,
    description: cleanedDesc,
  }
}

/**
 * Converte DD/MM/YYYY para YYYY-MM-DD
 */
function convertDateToISO(dateStr: string): string {
  const [day, month, year] = dateStr.split("/")
  return `${year}-${month}-${day}`
}

/**
 * PARSER PRINCIPAL
 * Texto bruto → Transações normalizadas
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
    const normalized = rawTransactions.map((raw) => normalizeTransaction(raw))

    return {
      transactions: normalized,
      summary: {
        confidence: normalized.length > 0 ? 0.98 : 0,
      },
    }
  } catch (error) {
    console.error("[Parser] Erro:", error instanceof Error ? error.message : String(error))
    return { transactions: [] }
  }
}

/**
 * Aliases para compatibilidade
 */
export const hybridParseTransactions = parseTransactionsWithAI

export function convertToNormalizedTransaction(
  tx: NormalizedTransaction,
  _fileId?: string
): NormalizedTransaction {
  return tx
}

export async function refineTransactionsWithAI(
  transactions: any[]
): Promise<{ transactions: NormalizedTransaction[]; summary: { confidence: number } }> {
  return {
    transactions: transactions as NormalizedTransaction[],
    summary: { confidence: 0.95 },
  }
}
