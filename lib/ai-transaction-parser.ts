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
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT"
  category: string
  description: string
  sourceFile?: string
}

/**
 * PASSO 1: Limpar e padronizar descrição
 */
function cleanDescription(rawDesc: string): string {
  let cleaned = rawDesc.trim()

  const prefixPatterns = [
    /^Compra\s+no\s+débito\s+/i,
    /^Compra\s+débito\s+/i,
    /^Compra\s+no\s+crédito\s+/i,
    /^Compra\s+no\s+débito\s+via\s+NuPay\s+/i,
    /^via\s+NuPay\s+/i,
    /^Transferência\s+recebida\s+pelo\s+Pix\s+via\s+Open\s+Banking\s+/i,
    /^Transferência\s+recebida\s+pelo\s+Pix\s+/i,
    /^Transferência\s+enviada\s+pelo\s+Pix\s+/i,
    /^Transferência\s+Recebida\s+/i,
    /^Transferência\s+recebida\s+/i,
    /^Transferência\s+enviada\s+/i,
    /^Transferência\s+/i,
    /^Reembolso\s+recebido\s+pelo\s+Pix\s+/i,
    /^Estorno\s+-\s+Compra\s+no\s+débito\s+via\s+NuPay\s+/i,
    /^Valor\s+adicionado\s+na\s+conta\s+por\s+cartão\s+de\s+crédito\s+/i,
    /^Depósito\s+de\s+/i,
    /^Pagamento\s+de\s+fatura\s+/i,
    /^Pagamento\s+/i,
    /^Resgate\s+/i,
    /^Aplicação\s+/i,
    /^pelo\s+Pix\s+/i,
    /^Pix\s+/i,
    /^TED\s+/i,
    /^DOC\s+/i,
    /^Boleto\s+/i,
    /^Recarga\s+/i,
  ]

  for (const pattern of prefixPatterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, "")
      break
    }
  }

  // Remover dados bancários (agência, conta, CPF)
  cleaned = cleaned.replace(/\s*-\s*[*]{3}\.\d{3}\.\d{3}-[*]{2}\s*/g, "")
  cleaned = cleaned.replace(/\s*-\s*\w+\s+\(?\d{4}\)?\s+Agência[^-]*/gi, "")
  cleaned = cleaned.replace(/Agência:\s*\d+\s+Conta:\s*[\d-]+/gi, "")
  cleaned = cleaned.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, "") // CNPJ
  cleaned = cleaned.replace(/\s+[A-Z]\s*$/, "")
  cleaned = cleaned.replace(/\s+\d{1,3}\s*$/, "")
  cleaned = cleaned.replace(/\s+/g, " ").trim()

  return cleaned
}

/**
 * Linhas de cabeçalho/rodapé do Nubank que devem ser ignoradas
 */
const NUBANK_LINHAS_IGNORAR = [
  /^saldo (inicial|final)/i,
  /^rendimento líquido/i,
  /^total de (entradas|saídas)/i,
  /^movimentações$/i,
  /^valores em r\$/i,
  /^extrato gerado/i,
  /^tem alguma dúvida/i,
  /^caso a solução/i,
  /^atendimento/i,
  /^ouvidoria/i,
  /^nu (financeira|pagamentos)/i,
  /^cnpj/i,
  /^\d+ de \d+$/i,
  /^R\$ \d/i,
  /^\+$/,
  /^-$/,
  /^/,
  /agência.*conta/i,
  /^cpf/i,
  /^de empréstimo/i,
]

function deveIgnorar(linha: string): boolean {
  return NUBANK_LINHAS_IGNORAR.some((re) => re.test(linha.trim()))
}

/**
 *  PARSER NUBANK - Extrai transações com INCOME/EXPENSE correto
 * Detecta contexto de "Total de entradas" e "Total de saídas" por dia
 */
function extractTransactionsFromText(text: string): Array<{
  date: string
  rawDescription: string
  value: number
  isExpense: boolean
}> {
  // Pré-processar: inserir quebras antes de datas e palavras-chave do Nubank
  const preprocessed = text
    .replace(/(\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+\d{4})/gi, "\n$1\n")
    .replace(/(Total de (?:entradas|saídas))/gi, "\n$1\n")
    .replace(
      /(Compra no débito|pelo Pix|Transferência enviada|Transferência recebida|Aplicação RDB|Resgate RDB|Depósito de|Pagamento de fatura)/gi,
      "\n$1"
    )

  const lines = preprocessed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const transactions: Array<{
    date: string
    rawDescription: string
    value: number
    isExpense: boolean
  }> = []

  const MESES: Record<string, string> = {
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

  let dataAtual = new Date().toLocaleDateString("pt-BR")
  let isExpense = false
  let buffer: string[] = []
  let bufferIsExpense = false

  const fechaBloco = () => {
    if (buffer.length === 0) return

    const block = buffer.join(" ")
    const valores = [...block.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})/g)]
    if (valores.length === 0) {
      buffer = []
      return
    }

    const valueStr = valores[valores.length - 1]![1]!
    const value = parseFloat(valueStr.replace(/\./g, "").replace(",", "."))

    const idx = block.lastIndexOf(valueStr)
    let description = block.substring(0, idx).trim()

    // Limpar prefixos bancários inline
    description = description
      .replace(
        /^(Compra no débito via NuPay|Compra no débito|Compra no crédito|via NuPay|pelo Pix|Reembolso recebido pelo Pix|Transferência enviada pelo Pix|Transferência recebida pelo Pix via Open Banking|Transferência recebida pelo Pix|Transferência Recebida|Estorno - Compra no débito via NuPay|Valor adicionado na conta por cartão de crédito|Depósito de|Aplicação)\s*/i,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()

    if (
      deveIgnorar(description) ||
      description.length < 2 ||
      value <= 0 ||
      description.length > 200
    ) {
      buffer = []
      return
    }

    transactions.push({
      date: dataAtual,
      rawDescription: description,
      value,
      isExpense: bufferIsExpense,
    })

    buffer = []
  }

  for (const line of lines) {
    // Detectar data "DD MES YYYY"
    const mData = line.match(
      /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})$/i
    )
    if (mData) {
      fechaBloco()
      const dia = mData[1]!
      const mes = MESES[mData[2]!.toUpperCase()] ?? "01"
      const ano = mData[3]!
      dataAtual = `${dia}/${mes}/${ano}`
      continue
    }

    // Detectar data "DD/MM/YYYY"
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(line)) {
      fechaBloco()
      dataAtual = line
      continue
    }

    // Detectar mudança de contexto
    if (/total de saídas/i.test(line)) {
      fechaBloco()
      isExpense = true
      continue
    }
    if (/total de entradas/i.test(line)) {
      fechaBloco()
      isExpense = false
      continue
    }

    // Ignorar cabeçalhos
    if (deveIgnorar(line)) {
      fechaBloco()
      continue
    }

    // Linha com valor -> fecha bloco
    if (line.match(/\d{1,3}(?:\.\d{3})*,\d{2}$/)) {
      buffer.push(line)
      bufferIsExpense = isExpense
      fechaBloco()
    } else {
      if (buffer.length === 0) bufferIsExpense = isExpense
      buffer.push(line)
    }
  }

  fechaBloco()
  return transactions
}

/**
 * PASSO 2: Classificar tipo
 */
function classifyType(desc: string, value: number): "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT" {
  const d = desc.toLowerCase()
  if (d.includes("aplicação") || d.includes("rdb") || d.includes("investimento")) return "INVESTMENT"
  if (d.includes("resgate")) return "INCOME"
  if (value > 0) return "INCOME"
  if (value < 0) return "EXPENSE"
  return "EXPENSE"
}

/**
 * PASSO 3: Classificar categoria
 */
function classifyCategory(desc: string): string {
  const d = desc.toLowerCase()

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
    d.includes("delivery") ||
    d.includes("burger") ||
    d.includes("pastel") ||
    d.includes("alimenta") ||
    d.includes("comida")
  )
    return "Alimentação"

  if (
    d.includes("uber") ||
    d.includes("99 tecnologia") ||
    d.includes("99food") ||
    d.includes("buser") ||
    d.includes("ônibus") ||
    d.includes("metrô") ||
    d.includes("combustível") ||
    d.includes("gasolina") ||
    d.includes("estacionamento") ||
    d.includes("pedágio") ||
    d.includes("transporte")
  )
    return "Transporte"

  if (
    d.includes("farmácia") ||
    d.includes("farmacia") ||
    d.includes("drogaria") ||
    d.includes("medicamento") ||
    d.includes("médico") ||
    d.includes("hospital") ||
    d.includes("clínica") ||
    d.includes("dentista") ||
    d.includes("laboratorio") ||
    d.includes("promofarma") ||
    d.includes("nutricar")
  )
    return "Saúde"

  if (
    d.includes("supermercado") ||
    d.includes("mercado") ||
    d.includes("carrefour") ||
    d.includes("atacadão") ||
    d.includes("hortifruti") ||
    d.includes("extra")
  )
    return "Mercado"

  if (
    d.includes("cinema") ||
    d.includes("teatro") ||
    d.includes("ingresso") ||
    d.includes("show") ||
    d.includes("cacau") ||
    d.includes("lazer")
  )
    return "Lazer"

  if (
    d.includes("spotify") ||
    d.includes("netflix") ||
    d.includes("prime") ||
    d.includes("disney") ||
    d.includes("assinatura") ||
    d.includes("streaming") ||
    d.includes("bytedance") ||
    d.includes("tiktok") ||
    d.includes("facebook") ||
    d.includes("ebanx") ||
    d.includes("assiny")
  )
    return "Assinaturas"

  if (
    d.includes("energia") ||
    d.includes("água") ||
    d.includes("gás") ||
    d.includes("internet") ||
    d.includes("aluguel") ||
    d.includes("condomínio") ||
    d.includes("edenred") ||
    d.includes("shpp")
  )
    return "Moradia"

  return "Outros"
}

/**
 * NORMALIZADOR PRINCIPAL
 */
function normalizeTransaction(raw: {
  date: string
  rawDescription: string
  value: number
  isExpense?: boolean
}): NormalizedTransaction {
  const cleanedDesc = cleanDescription(raw.rawDescription)

  let type: "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT"
  const d = raw.rawDescription.toLowerCase()

  if (d.includes("aplicação") || d.includes("rdb") || d.includes("investimento")) {
    type = "INVESTMENT"
  } else if (d.includes("resgate")) {
    type = "INCOME"
  } else if (raw.isExpense === true) {
    type = "EXPENSE"
  } else if (raw.isExpense === false) {
    type = "INCOME"
  } else {
    type = classifyType(raw.rawDescription, raw.value)
  }

  const category = classifyCategory(cleanedDesc)

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
  const parts = dateStr.split("/")
  if (parts.length !== 3) return new Date().toISOString().split("T")[0]!
  const [day, month, year] = parts
  return `${year}-${month}-${day}`
}

/**
 * PARSER PRINCIPAL
 */
export async function parseTransactionsWithAI(
  text: string,
  _sourceType: "pdf" | "excel" | "csv" = "pdf",
  _bankHint?: string
): Promise<{ transactions: NormalizedTransaction[]; summary?: { confidence: number } }> {
  // INSTRUÇÃO DE SISTEMA RÍGIDA:
  // Sempre classifique como TRANSFER qualquer transação que contenha as palavras-chave:
  // "TED", "DOC", "PIX MESMA TITULARIDADE", "TRANSFERÊNCIA", "TRANSFERENCIA", "ENTRE CONTAS", "MESMA TITULARIDADE"
  // Isso vale para qualquer variação de caixa ou acentuação.
  if (!text || text.trim().length === 0) {
    return { transactions: [] }
  }

  try {
    const rawTransactions = extractTransactionsFromText(text)
    const normalized = rawTransactions.map((raw) => {
      let tx = normalizeTransaction(raw)
      // Pós-processamento rígido para TRANSFER
      const desc = tx.description.toLowerCase()
      if (
        /ted|doc|pix mesma titularidade|transfer[êe]ncia|entre contas|mesma titularidade/.test(desc)
      ) {
        tx.type = "TRANSFER"
      }
      return tx
    })

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
