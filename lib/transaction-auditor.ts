/**
 * AUDITOR DE TRANSAÇÕES FINANCEIRAS
 *
 * Função: VALIDAR e CORRIGIR transações já processadas
 * Input: transação normalizada (com raw_description para context)
 * Output: transação corrigida ou validada
 *
 * Não recria dados. Apenas valida e corrige erros de lógica.
 */

export interface TransactionToAudit {
  date: string
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  value: number
  description: string
  raw_description?: string
}

export interface AuditedTransaction {
  date: string
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  value: number
  description: string
  corrected?: boolean
  corrections?: string[]
}

/**
 * RULE 1: Validar tipo baseado em valor
 */
function validateType(value: number, type: string, raw: string): "INCOME" | "EXPENSE" | "TRANSFER" {
  const d = raw.toLowerCase()

  // Regra especial: Aplicação → TRANSFER (investimento)
  if (d.includes("aplicacao") || d.includes("aplicação")) {
    return "TRANSFER"
  }

  // Regra especial: Resgate → INCOME
  if (d.includes("resgate")) {
    return "INCOME"
  }

  // Regra de valor
  if (value < 0) {
    return "EXPENSE"
  }

  if (value > 0) {
    return "INCOME"
  }

  return "EXPENSE" // default
}

/**
 * RULE 2: Validar categoria com prioridade semântica
 * Ordem de prioridade:
 * 1. Investimento
 * 2. Transferência
 * 3. Assinaturas
 * 4. Alimentação
 * 5. Transporte
 * 6. Saúde
 * 7. Mercado
 * 8. Moradia
 * 9. Lazer
 * 10. Outros
 */
function validateCategory(
  description: string,
  raw_description: string,
  currentCategory: string
): string {
  const desc = description.toLowerCase()
  const raw = (raw_description || "").toLowerCase()
  const combined = `${desc} ${raw}`

  // PRIORIDADE 1: Investimento
  if (
    combined.includes("aplicacao") ||
    combined.includes("aplicação") ||
    combined.includes("resgate") ||
    combined.includes("rdb") ||
    combined.includes("fundo")
  ) {
    return "Investimento"
  }

  // PRIORIDADE 2: Transferência (PERO: só se não houver outro contexto)
  // Ex: "PIX IFOOD" → Alimentação, não Transferência
  const hasSpecificContext =
    combined.includes("ifood") ||
    combined.includes("restaurante") ||
    combined.includes("padaria") ||
    combined.includes("farmácia") ||
    combined.includes("farmacia") ||
    combined.includes("transporte") ||
    combined.includes("uber") ||
    combined.includes("spotify") ||
    combined.includes("netflix")

  if (
    !hasSpecificContext &&
    (combined.includes("pix") || combined.includes("ted") || combined.includes("doc"))
  ) {
    return "Transferência"
  }

  // PRIORIDADE 3: Assinaturas
  if (
    combined.includes("spotify") ||
    combined.includes("netflix") ||
    combined.includes("prime") ||
    combined.includes("disney") ||
    combined.includes("assinatura") ||
    combined.includes("streaming") ||
    combined.includes("youtube premium")
  ) {
    return "Assinaturas"
  }

  // PRIORIDADE 4: Alimentação
  if (
    combined.includes("padaria") ||
    combined.includes("restaurante") ||
    combined.includes("ifood") ||
    combined.includes("lanchonete") ||
    combined.includes("pizzaria") ||
    combined.includes("café") ||
    combined.includes("sorveteria") ||
    combined.includes("churrascaria") ||
    combined.includes("açougue") ||
    combined.includes("delivery") ||
    combined.includes("bar") ||
    combined.includes("boteco")
  ) {
    return "Alimentação"
  }

  // PRIORIDADE 5: Transporte
  if (
    combined.includes("uber") ||
    combined.includes("99") ||
    combined.includes("ônibus") ||
    combined.includes("metrô") ||
    combined.includes("taxi") ||
    combined.includes("táxi") ||
    combined.includes("passagem") ||
    combined.includes("combustível") ||
    combined.includes("gasolina") ||
    combined.includes("estacionamento") ||
    combined.includes("pedágio")
  ) {
    return "Transporte"
  }

  // PRIORIDADE 6: Saúde
  if (
    combined.includes("farmácia") ||
    combined.includes("farmacia") ||
    combined.includes("drogaria") ||
    combined.includes("medicamento") ||
    combined.includes("médico") ||
    combined.includes("medico") ||
    combined.includes("hospital") ||
    combined.includes("clínica") ||
    combined.includes("clinica") ||
    combined.includes("odonto") ||
    combined.includes("dentista") ||
    combined.includes("fisioterapia")
  ) {
    return "Saúde"
  }

  // PRIORIDADE 7: Mercado
  if (
    combined.includes("supermercado") ||
    combined.includes("mercado") ||
    combined.includes("carrefour") ||
    combined.includes("pão de açúcar") ||
    combined.includes("extra") ||
    combined.includes("atacadão") ||
    combined.includes("hortifruti")
  ) {
    return "Mercado"
  }

  // PRIORIDADE 8: Moradia
  if (
    combined.includes("energia") ||
    combined.includes("água") ||
    combined.includes("gás") ||
    combined.includes("internet") ||
    combined.includes("telefone") ||
    combined.includes("aluguel") ||
    combined.includes("condomínio") ||
    combined.includes("condominio")
  ) {
    return "Moradia"
  }

  // PRIORIDADE 9: Lazer
  if (
    combined.includes("cinema") ||
    combined.includes("teatro") ||
    combined.includes("ingresso") ||
    combined.includes("show") ||
    combined.includes("clube") ||
    combined.includes("parque") ||
    combined.includes("museu")
  ) {
    return "Lazer"
  }

  // PRIORIDADE 10: Outros (fallback)
  return currentCategory || "Outros"
}

/**
 * RULE 3: Validar e limpar descrição
 */
function validateDescription(description: string, raw_description: string): string {
  // Se já foi limpo, manter
  if (description && description.length > 0 && !description.match(/^Compra|^Transf|^Pagam/i)) {
    return description
  }

  // Se não, tentar limpar do raw
  if (!raw_description) {
    return description
  }

  let cleaned = raw_description.trim()

  // Remover prefixos
  const prefixes = [
    /^Compra\s+no\s+débito\s+/i,
    /^Compra\s+débito\s+/i,
    /^Transferência\s+recebida\s+/i,
    /^Transferência\s+enviada\s+/i,
    /^Transferência\s+/i,
    /^Depósito\s+/i,
    /^Pagamento\s+de\s+fatura\s+/i,
    /^Pagamento\s+/i,
  ]

  for (const pattern of prefixes) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, "")
      break
    }
  }

  // Remover sufixos
  cleaned = cleaned.replace(/\s+[A-Z]\s*$/, "")
  cleaned = cleaned.replace(/\s+\d{1,3}\s*$/, "")

  // Limpar espaços
  cleaned = cleaned.replace(/\s+/g, " ").trim()

  return cleaned || description
}

/**
 * AUDITOR PRINCIPAL
 * Recebe transação processada e valida/corrige
 */
export function auditTransaction(input: TransactionToAudit): AuditedTransaction {
  const corrections: string[] = []
  let corrected = false

  // 1. Validar tipo
  const validatedType = validateType(
    input.value,
    input.type,
    input.raw_description || input.description
  )
  if (validatedType !== input.type) {
    corrections.push(`Tipo corrigido: ${input.type} → ${validatedType}`)
    corrected = true
  }

  // 2. Validar categoria
  const validatedCategory = validateCategory(
    input.description,
    input.raw_description || "",
    input.category
  )
  if (validatedCategory !== input.category) {
    corrections.push(`Categoria corrigida: ${input.category} → ${validatedCategory}`)
    corrected = true
  }

  // 3. Validar descrição
  const validatedDescription = validateDescription(input.description, input.raw_description || "")
  if (validatedDescription !== input.description) {
    corrections.push(`Descrição corrigida: "${input.description}" → "${validatedDescription}"`)
    corrected = true
  }

  return {
    date: input.date,
    type: validatedType,
    category: validatedCategory,
    value: input.value,
    description: validatedDescription,
    corrected: corrected,
    corrections: corrected ? corrections : undefined,
  }
}

/**
 * Auditar lista de transações
 */
export function auditTransactions(transactions: TransactionToAudit[]): AuditedTransaction[] {
  return transactions.map((tx) => auditTransaction(tx))
}
