/**
 * Processador de PDF Simplificado e Robusto
 * Versão corrigida que funciona consistentemente
 */

import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { extractTextFromPdf } from "@/lib/document-extract"
import { detectBankFromText } from "@/lib/bank-parsers"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"

interface SimpleTransaction {
  date: string
  amount: number
  description: string
  type: "INCOME" | "EXPENSE"
  category: string
}

/**
 * Processa PDF de forma simplificada e direta
 */
export async function processPdfSimple(documentId: string): Promise<void> {
  console.log(`🔄 Iniciando processamento simples do PDF: ${documentId}`)

  try {
    // 1. Buscar documento
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { userId: true, extractedText: true, fileName: true },
    })

    if (!doc || !doc.extractedText) {
      throw new Error("Documento não encontrado ou sem texto extraído")
    }

    // 2. Parse simples de transações
    const transactions = parseSimpleTransactions(doc.extractedText, doc.fileName)

    if (transactions.length === 0) {
      console.warn(`⚠️ Nenhuma transação encontrada em ${doc.fileName}`)
      await updateDocumentStatus(
        documentId,
        DocumentStatus.COMPLETED,
        "Nenhuma transação encontrada"
      )
      return
    }

    console.log(`📊 Encontradas ${transactions.length} transações`)

    // 3. Importar transações
    const result = await importTransactionsFromPdfWithDedup(doc.userId, transactions)

    console.log(`✅ Importação concluída: ${result.success} sucesso, ${result.failed} falhas`)

    // 4. Atualizar status
    const status = result.success > 0 ? DocumentStatus.COMPLETED : DocumentStatus.FAILED
    const errorMessage = result.failed > 0 ? `${result.failed} transações falharam` : null

    await updateDocumentStatus(documentId, status, errorMessage)
  } catch (error) {
    console.error(`❌ Erro no processamento do PDF ${documentId}:`, error)
    await updateDocumentStatus(
      documentId,
      DocumentStatus.FAILED,
      error instanceof Error ? error.message : "Erro desconhecido"
    )
  }
}

/**
 * Converte data no formato do Nubank (ex: "01 SET 2025") para formato padrão
 */
function convertNubankDate(dateStr: string): string {
  const months: Record<string, string> = {
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

  const parts = dateStr.trim().split(/\s+/)
  if (parts.length === 3) {
    const [, monthAbbr, year] = parts
    if (monthAbbr) {
      const monthNum = months[monthAbbr.toUpperCase()]
      if (monthNum) {
        return `${parts[0]}/${monthNum}/${year}`
      }
    }
  }

  return dateStr
}

/**
 * Encontra a data mais próxima de uma transação no texto
 */
function findDateForTransaction(text: string, position: number): string {
  // Procurar datas antes da posição da transação
  const beforeText = text.slice(0, position)
  const datePattern = /(\d{2}\s+\w{3}\s+\d{4})/g
  let match
  let lastDate = ""

  while ((match = datePattern.exec(beforeText)) !== null) {
    if (match[1]) {
      lastDate = match[1]
    }
  }

  return lastDate ? convertNubankDate(lastDate) : new Date().toISOString().slice(0, 10)
}

/**
 * Parser específico para extratos Nubank
 */
function parseNubankTransactions(text: string): SimpleTransaction[] {
  const transactions: SimpleTransaction[] = []

  console.log("🏦 Tentando parser Nubank...")

  // Procurar por blocos de transações por data
  const dateBlocks = text.split(/(\d{2}\s+\w{3}\s+\d{4})/).filter((block) => block.trim())

  for (let i = 1; i < dateBlocks.length; i += 2) {
    const dateStr = dateBlocks[i]?.trim()
    const contentBlock = dateBlocks[i + 1]?.trim()

    if (!dateStr || !contentBlock) continue

    const date = convertNubankDate(dateStr)
    console.log(`📅 Processando bloco: ${date}`)

    // Procurar transações no bloco
    // Padrão 1: Total de entradas
    const totalEntradasMatch = contentBlock.match(/Total de entradas\s+\+?\s*(\d+[.,]\d{2})/)
    if (totalEntradasMatch && totalEntradasMatch[1]) {
      const value = parseFloat(totalEntradasMatch[1].replace(".", "").replace(",", "."))
      if (value > 0) {
        transactions.push({
          date,
          amount: value,
          description: "Entradas do dia",
          type: "INCOME",
          category: "Outras Receitas",
        })
      }
    }

    // Padrão 2: Transferências enviadas
    const transferenciasEnviadas = contentBlock.matchAll(
      /Transferência enviada pelo Pix\s+(.+?)\s+(\d+[.,]\d{2})/g
    )
    for (const match of transferenciasEnviadas) {
      const [, description, valueStr] = match
      if (!description || !valueStr) continue
      const value = parseFloat(valueStr.replace(".", "").replace(",", "."))
      if (value > 0) {
        transactions.push({
          date,
          amount: value,
          description: `Transferência enviada: ${description.trim()}`,
          type: "EXPENSE",
          category: "Transferências",
        })
      }
    }

    // Padrão 3: Transferências recebidas
    const transferenciasRecebidas = contentBlock.matchAll(
      /Transferência Recebida\s+(.+?)\s+(\d+[.,]\d{2})/g
    )
    for (const match of transferenciasRecebidas) {
      const [, description, valueStr] = match
      if (!description || !valueStr) continue
      const value = parseFloat(valueStr.replace(".", "").replace(",", "."))
      if (value > 0) {
        transactions.push({
          date,
          amount: value,
          description: `Transferência recebida: ${description.trim()}`,
          type: "INCOME",
          category: "Transferências",
        })
      }
    }

    // Padrão 4: Outras transações com valor no final da linha
    const otherTransactions = contentBlock.matchAll(/(.+?)\s+(\d+[.,]\d{2})\s*$/gm)
    for (const match of otherTransactions) {
      const [, description, valueStr] = match
      if (!description || !valueStr) continue
      const value = parseFloat(valueStr.replace(".", "").replace(",", "."))
      if (value > 0 && description.trim().length > 5) {
        // Evitar pegar valores isolados
        transactions.push({
          date,
          amount: value,
          description: description.trim(),
          type: "EXPENSE",
          category: categorizeTransaction(description.trim(), "EXPENSE"),
        })
      }
    }
  }

  console.log(`🏦 Parser Nubank encontrou ${transactions.length} transações`)
  return transactions
}

/**
 * Parser simples e robusto de transações
 */
export function parseSimpleTransactions(text: string, fileName: string): SimpleTransaction[] {
  const transactions: SimpleTransaction[] = []
  const lines = text.split("\n").filter((line) => line.trim().length > 0)

  console.log(`📝 Analisando ${lines.length} linhas de texto...`)

  // Parser específico para Nubank baseado no formato real
  const nubankTransactions = parseNubankTransactions(text)
  if (nubankTransactions.length > 0) {
    return nubankTransactions
  }

  // Padrões para outros formatos de extrato
  const patterns = [
    // Padrão 1: Data Descrição Valor (ex: 15/09 PAGAMENTO -150,00)
    /(\d{2}\/\d{2})\s+(.+?)\s+(-?\d+[.,]\d{2})\s*$/gm,
    // Padrão 2: Data completa Descrição Valor (ex: 15/09/2025 PAGAMENTO -150,00)
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d+[.,]\d{2})\s*$/gm,
    // Padrão 3: Valor Data Descrição (ex: -150,00 15/09 PAGAMENTO)
    /(-?\d+[.,]\d{2})\s+(\d{2}\/\d{2})\s+(.+?)\s*$/gm,
  ]

  // Processar cada padrão específico
  for (const pattern of patterns) {
    let matches
    while ((matches = pattern.exec(text)) !== null) {
      let date: string
      let description: string
      let valueStr: string
      let value: number

      // Padrão 1: Total de entradas
      if (pattern.toString().includes("Total de entradas")) {
        const [, dateStr, valueMatch] = matches
        if (!dateStr || !valueMatch) continue

        date = convertNubankDate(dateStr)
        valueStr = valueMatch
        value = parseFloat(valueStr.replace(".", "").replace(",", "."))
        description = "Entradas do dia"
      }
      // Padrão 2: Transferência enviada
      else if (pattern.toString().includes("Transferência enviada")) {
        const [, descMatch, valueMatch] = matches
        if (!descMatch || !valueMatch) continue

        // Para transferências enviadas, precisamos encontrar a data
        date = findDateForTransaction(text, matches.index || 0)
        valueStr = valueMatch
        value = parseFloat(valueStr.replace(".", "").replace(",", "."))
        description = `Transferência enviada: ${descMatch.trim()}`
      }
      // Padrão 3: Transferência recebida
      else if (pattern.toString().includes("Transferência Recebida")) {
        const [, descMatch, valueMatch] = matches
        if (!descMatch || !valueMatch) continue

        date = findDateForTransaction(text, matches.index || 0)
        valueStr = valueMatch
        value = parseFloat(valueStr.replace(".", "").replace(",", "."))
        description = `Transferência recebida: ${descMatch.trim()}`
      }
      // Padrões tradicionais
      else {
        const [, dateOrValue, descOrValue, valueOrDesc] = matches

        if (!dateOrValue || !descOrValue || !valueOrDesc) continue

        if (dateOrValue.match(/^\d{2}\/\d{2}/) || dateOrValue.match(/^\d{2}\s+\w{3}\s+\d{4}/)) {
          // Padrão com data primeiro
          date = dateOrValue
          description = descOrValue
          valueStr = valueOrDesc
        } else {
          // Padrão com valor primeiro
          valueStr = dateOrValue
          date = descOrValue
          description = valueOrDesc
        }

        value = parseFloat(valueStr.replace(".", "").replace(",", "."))
      }

      if (isNaN(value) || value === 0) continue

      // Normalizar data
      if (date.match(/^\d{2}\/\d{2}$/)) {
        const year = new Date().getFullYear()
        date = `${date}/${year}`
      }

      // Determinar tipo e categoria
      const type = value < 0 ? "EXPENSE" : "INCOME"
      const amount = Math.abs(value)
      const category = categorizeTransaction(description, type)

      transactions.push({
        date,
        amount,
        description: description.trim(),
        type,
        category,
      })
    }
  }

  // Remover duplicados
  const uniqueTransactions = transactions.filter(
    (tx, index, self) =>
      index ===
      self.findIndex(
        (t) => t.date === tx.date && t.amount === tx.amount && t.description === tx.description
      )
  )

  console.log(`🔍 ${uniqueTransactions.length} transações únicas após deduplicação`)
  return uniqueTransactions
}

/**
 * Categorização simples baseada em palavras-chave
 */
function categorizeTransaction(description: string, type: "INCOME" | "EXPENSE"): string {
  const desc = description.toLowerCase()

  if (type === "INCOME") {
    if (desc.includes("salario") || desc.includes("salário")) return "Salário"
    if (desc.includes("freelance") || desc.includes("pj")) return "Freelance"
    if (desc.includes("rendimento") || desc.includes("juros")) return "Investimentos"
    return "Outras Receitas"
  }

  // EXPENSE
  if (desc.includes("supermercado") || desc.includes("mercado")) return "Alimentação"
  if (desc.includes("restaurante") || desc.includes("lanche")) return "Alimentação"
  if (desc.includes("aluguel")) return "Moradia"
  if (desc.includes("condominio") || desc.includes("condomínio")) return "Moradia"
  if (desc.includes("energia") || desc.includes("luz")) return "Contas"
  if (desc.includes("agua") || desc.includes("água")) return "Contas"
  if (desc.includes("internet") || desc.includes("telefone")) return "Contas"
  if (desc.includes("transporte") || desc.includes("uber") || desc.includes("taxi"))
    return "Transporte"
  if (desc.includes("combustivel") || desc.includes("gasolina")) return "Transporte"
  if (desc.includes("farmacia") || desc.includes("remedio") || desc.includes("remédio"))
    return "Saúde"
  if (desc.includes("educacao") || desc.includes("escola") || desc.includes("faculdade"))
    return "Educação"
  if (desc.includes("cartao") || desc.includes("fatura")) return "Cartões"

  return "Outros"
}

/**
 * Atualiza status do documento no banco
 */
async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  errorMessage: string | null = null
): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status,
      errorMessage,
      updatedAt: new Date(),
    },
  })
}
