/**
 * Parser de extrato Nubank
 * Fluxo correto:
 * 1. Receber texto extraído
 * 2. Identificar blocos por data (regex)
 * 3. Extrair linhas de transações
 * 4. Classificar tipo (entrada/saída)
 * 5. Normalizar valores
 * 6. Aplicar categorização
 */

export interface SimpleTransaction {
  date: string // DD/MM/YYYY
  description: string
  value: number // signed: negativo=saída, positivo=entrada
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  rawLine: string
}

/**
 * Extrai transações do texto bruto usando regex
 * Esperado formato Nubank:
 * DD/MM/YYYY Descrição da Transação -X.XXX,XX ou +X.XXX,XX
 */
export function parseNubankTransactions(text: string): SimpleTransaction[] {
  const transactions: SimpleTransaction[] = []

  // Regex para linha de transação Nubank
  // Formato: DD/MM/YYYY espaço descrição valor
  const lineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?[\d.]+,\d{2})$/gm

  let match
  while ((match = lineRegex.exec(text)) !== null) {
    if (match.length < 4) continue

    const dateStr = match[1]!
    const description = match[2]!
    const valueStr = match[3]!

    // Parse da data
    const date = dateStr.trim() // DD/MM/YYYY

    // Parse da descrição
    const desc = description.trim()

    // Parse do valor
    const valueNum = parseNubankValue(valueStr.trim())

    // Classificar tipo
    const type = classifyTransactionType(desc)

    transactions.push({
      date,
      description: desc,
      value: valueNum,
      type,
      rawLine: match[0]!,
    })
  }

  return transactions
}

/**
 * Converte valor do formato Nubank (1.234,56 ou -1.234,56) para número
 * Negativo = saída (expense)
 * Positivo = entrada (income)
 */
function parseNubankValue(valueStr: string): number {
  // Remove espaços
  valueStr = valueStr.trim()

  // Verifica se é negativo (começa com - ou parênteses)
  const isNegative = valueStr.startsWith("-") || valueStr.startsWith("(")

  // Remove caracteres especiais mantendo números
  const cleanValue = valueStr.replace(/[^\d,]/g, "").replace(",", ".")

  let num = parseFloat(cleanValue)
  if (isNaN(num)) num = 0

  return isNegative ? -num : num
}

/**
 * Classifica o tipo de transação baseado na descrição
 */
function classifyTransactionType(description: string): "INCOME" | "EXPENSE" | "TRANSFER" {
  const desc = description.toLowerCase()

  // Rendimento, transferência recebida = INCOME
  if (
    desc.includes("rendimento") ||
    desc.includes("juros") ||
    desc.includes("transferência recebida") ||
    desc.includes("depósito") ||
    desc.includes("crédito")
  ) {
    return "INCOME"
  }

  // Transferência enviada, pagamento = TRANSFER
  if (
    desc.includes("transferência enviada") ||
    desc.includes("transferência") ||
    desc.includes("ted") ||
    desc.includes("pix") ||
    desc.includes("pagamento")
  ) {
    return "TRANSFER"
  }

  // Compra, débito = EXPENSE
  return "EXPENSE"
}

/**
 * Categoriza transação baseado em regras
 */
export function categorizeTransaction(
  description: string,
  type: string
): { category: string; confidence: number } {
  const desc = description.toLowerCase()

  // Regras baseadas em keywords
  const rules: Array<{
    keywords: string[]
    category: string
    type?: string
  }> = [
    { keywords: ["iFood", "ifood", "delivery", "uber eats", "rappi"], category: "Alimentação" },
    { keywords: ["uber", "taxi", "99", "táxi", "combustível", "gasolina"], category: "Transporte" },
    { keywords: ["farmacia", "farmácia", "drogaria", "medicamento"], category: "Saúde" },
    { keywords: ["supermarket", "mercado", "supermercado", "carrefour"], category: "Mercado" },
    { keywords: ["spotify", "netflix", "prime", "disney", "cinema"], category: "Entretenimento" },
    { keywords: ["restaurante", "pizzaria", "bar", "café"], category: "Alimentação" },
    { keywords: ["energia", "água", "internet", "telefone"], category: "Utilidades" },
    {
      keywords: ["boleto", "conta", "fatura"],
      category: "Contas",
      type: "TRANSFER",
    },
  ]

  for (const rule of rules) {
    if (rule.type && rule.type !== type) continue

    if (rule.keywords.some((kw) => desc.includes(kw.toLowerCase()))) {
      return { category: rule.category, confidence: 0.9 }
    }
  }

  // Default
  return {
    category: type === "INCOME" ? "Renda" : type === "TRANSFER" ? "Transferência" : "Outros",
    confidence: 0.5,
  }
}

/**
 * Exemplo de uso com dados mockados
 */
export function testNubankParser() {
  const mockNubankText = `
  EXTRATO DE CONTA
  Período: 01/01/2025 a 31/01/2025

  01/01/2025 UBER 3004 -45,90
  02/01/2025 IFOOD RESTAURANTE -89,50
  03/01/2025 SALARIO EMPRESA XYZ +3.500,00
  05/01/2025 TRANSFERENCIA ENVIADA -1.000,00
  07/01/2025 FARMACIA POPULACIONAL -25,80
  10/01/2025 PIX RECEBIDO +200,00
  15/01/2025 NETFLIX -19,90
  20/01/2025 SUPERMERCADO CARREFOUR -234,56
  25/01/2025 BOLETO CONTA LUZ -189,99
  `

  const transactions = parseNubankTransactions(mockNubankText)

  console.log("=== Transações Parseadas ===")
  transactions.forEach((tx) => {
    const cat = categorizeTransaction(tx.description, tx.type)
    console.log(
      `${tx.date} | ${tx.description.padEnd(35)} | R$ ${tx.value.toFixed(2).padStart(10)} | ${tx.type.padEnd(8)} | ${cat.category}`
    )
  })

  return transactions
}
