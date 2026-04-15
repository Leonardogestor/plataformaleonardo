type TransactionType = "INCOME" | "EXPENSE" | "INVESTIMENTO"

interface Transaction {
  date: string
  description: string
  value: number
}

interface NormalizedTransaction extends Transaction {
  type: TransactionType
  category: string
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[áéíóúàâãç]/g, (c) => {
      const map: { [key: string]: string } = {
        á: "a",
        é: "e",
        í: "i",
        ó: "o",
        ú: "u",
        à: "a",
        â: "a",
        ã: "a",
        ç: "c",
      }
      return map[c] || c
    })
    .replace(/[^\w\s*]/g, "")
    .replace(/\s+/g, " ")
}

function normalizeForDisplay(raw: string): string {
  let text = normalize(raw)

  const prefixes = ["compra no debito", "transferencia recebida", "transferencia enviada"]

  for (const prefix of prefixes) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length).trim()
      break
    }
  }

  text = text.replace(/\s+[a-z]$/, "").trim()

  return text
}

function detectType(value: number, description: string): TransactionType {
  const desc = normalize(description)

  // Check resgate FIRST (it takes precedence over investment keywords)
  if (desc.includes("resgate")) {
    return "INCOME"
  }

  const isInvestimento =
    desc.includes("aplicacao") ||
    desc.includes("investimento") ||
    desc.includes("rdb") ||
    desc.includes("cdb") ||
    desc.includes("fundo")

  if (isInvestimento) {
    return "INVESTIMENTO"
  }

  return value < 0 ? "EXPENSE" : "INCOME"
}

function classifyCategory(description: string): string {
  const desc = normalize(description)

  const isAlimentacao =
    desc.includes("ifood") ||
    desc.includes("restaurante") ||
    desc.includes("padaria") ||
    desc.includes("lanchonete")

  const isTransporte = desc.includes("uber") || desc.includes("99")

  const isSaude = desc.includes("drogaria") || desc.includes("farmacia")

  const isMercado = desc.includes("mercado") || desc.includes("atacadao")

  const isAssinatura = desc.includes("spotify") || desc.includes("netflix")

  const isInvestimento =
    desc.includes("aplicacao") ||
    desc.includes("investimento") ||
    desc.includes("rdb") ||
    desc.includes("cdb") ||
    desc.includes("fundo")

  const isTransferencia = desc.includes("pix") || desc.includes("ted") || desc.includes("doc")

  // 1. Investimento
  if (isInvestimento) {
    return "Investimento"
  }

  // 2. Transferência (com prioridade semântica)
  if (isTransferencia) {
    if (isAlimentacao) return "Alimentação"
    if (isTransporte) return "Transporte"
    if (isSaude) return "Saúde"
    if (isMercado) return "Mercado"
    return "Transferência"
  }

  // 3. Assinaturas
  if (isAssinatura) {
    return "Assinaturas"
  }

  // 4. Alimentação
  if (isAlimentacao) {
    return "Alimentação"
  }

  // 5. Transporte
  if (
    isTransporte ||
    desc.includes("passagem") ||
    desc.includes("combustivel") ||
    desc.includes("estacionamento")
  ) {
    return "Transporte"
  }

  // 6. Saúde
  if (isSaude || desc.includes("medico") || desc.includes("hospital") || desc.includes("clinica")) {
    return "Saúde"
  }

  // 7. Mercado
  if (isMercado) {
    return "Mercado"
  }

  // 8. Moradia
  if (
    desc.includes("aluguel") ||
    desc.includes("condominio") ||
    desc.includes("agua") ||
    desc.includes("energia")
  ) {
    return "Moradia"
  }

  // 9. Lazer
  if (
    desc.includes("cinema") ||
    desc.includes("teatro") ||
    desc.includes("parque") ||
    desc.includes("jogo")
  ) {
    return "Lazer"
  }

  // 10. Outros
  return "Outros"
}

function normalizeTransaction(transaction: Transaction): NormalizedTransaction {
  const displayDesc = normalizeForDisplay(transaction.description)
  const type = detectType(transaction.value, transaction.description)
  const category = classifyCategory(transaction.description)

  return {
    date: transaction.date,
    type,
    category,
    value: transaction.value,
    description: displayDesc.toUpperCase(),
  }
}

export {
  normalize,
  normalizeForDisplay,
  detectType,
  classifyCategory,
  normalizeTransaction,
  Transaction,
  NormalizedTransaction,
  TransactionType,
}
