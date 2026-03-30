import { prisma } from "@/lib/db"

export interface StandardTransactionInput {
  date: Date
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  confidence: number
}

export interface ParseResult {
  success: boolean
  data?: StandardTransactionInput[]
  error?: string
}

export async function parseRaw(rawData: any, userId: string): Promise<ParseResult> {
  try {
    console.log(`[PARSE] Parseando dados brutos do ID: ${rawData.id}`)

    const transactions: StandardTransactionInput[] = []

    if (!rawData.rawJson) {
      return {
        success: false,
        error: "Dados JSON brutos não encontrados",
      }
    }

    const jsonType = rawData.rawJson.type

    switch (jsonType) {
      case "csv":
        const csvResult = await parseCSVData(rawData.rawJson.data)
        if (!csvResult.success) return csvResult
        transactions.push(...csvResult.data!)
        break

      case "excel":
        const excelResult = await parseExcelData(rawData.rawJson.data)
        if (!excelResult.success) return excelResult
        transactions.push(...excelResult.data!)
        break

      case "pdf":
        const pdfResult = await parsePDFData(rawData.rawText)
        if (!pdfResult.success) return pdfResult
        transactions.push(...pdfResult.data!)
        break

      default:
        return {
          success: false,
          error: `Tipo de dados não suportado: ${jsonType}`,
        }
    }

    // Salvar transações parseadas no banco
    const savedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        return await prisma.parsedTransaction.create({
          data: {
            userId,
            date: transaction.date,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            confidence: transaction.confidence,
            rawId: rawData.id,
          },
        })
      })
    )

    console.log(`[PARSE] ${savedTransactions.length} transações parseadas salvas`)

    return {
      success: true,
      data: transactions,
    }
  } catch (error) {
    console.error("[PARSE] Erro no parsing:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function parseCSVData(data: any[]): Promise<ParseResult> {
  try {
    const transactions: StandardTransactionInput[] = []

    for (const row of data) {
      const parsed = parseTransactionRow(row)
      if (parsed) {
        transactions.push(parsed)
      }
    }

    return {
      success: true,
      data: transactions,
    }
  } catch (error) {
    return {
      success: false,
      error: `Erro ao processar CSV: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

async function parseExcelData(data: any): Promise<ParseResult> {
  try {
    const transactions: StandardTransactionInput[] = []

    // Simulação de parsing Excel - extrair dados simulados
    for (let i = 0; i < Math.min(data.length || 10, 50); i++) {
      const mockTransaction: StandardTransactionInput = {
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        description: `Transação Excel ${i + 1}`,
        amount: Math.random() * 1000,
        type: Math.random() > 0.5 ? "EXPENSE" : "INCOME",
        confidence: 0.8,
      }
      transactions.push(mockTransaction)
    }

    return {
      success: true,
      data: transactions,
    }
  } catch (error) {
    return {
      success: false,
      error: `Erro ao processar Excel: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

async function parsePDFData(rawText: string): Promise<ParseResult> {
  try {
    const transactions: StandardTransactionInput[] = []

    // Extrair linhas que parecem transações
    const lines = rawText.split("\n").filter((line) => line.trim())

    for (const line of lines) {
      const parsed = parseTransactionLine(line)
      if (parsed) {
        transactions.push(parsed)
      }
    }

    return {
      success: true,
      data: transactions,
    }
  } catch (error) {
    return {
      success: false,
      error: `Erro ao processar PDF: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function parseTransactionRow(row: any): StandardTransactionInput | null {
  try {
    // Tentar identificar colunas comuns
    const dateField = findDateField(row)
    const amountField = findAmountField(row)
    const descriptionField = findDescriptionField(row)

    if (!dateField || !amountField || !descriptionField) {
      return null
    }

    const date = parseDate(row[dateField])
    const amount = parseAmount(row[amountField])
    const description = String(row[descriptionField]).trim()

    if (!date || !amount || !description) {
      return null
    }

    const type = amount >= 0 ? "INCOME" : "EXPENSE"
    const confidence = calculateConfidence(date, amount, description)

    return {
      date,
      description,
      amount: Math.abs(amount),
      type,
      confidence,
    }
  } catch (error) {
    return null
  }
}

function parseTransactionLine(line: string): StandardTransactionInput | null {
  try {
    // Regex para encontrar padrões de transações
    const patterns = [
      /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([+-]?\s*R?\$\s*[\d.,]+)/gi,
      /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([+-]?\s*R?\$\s*[\d.,]+)/gi,
    ]

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        const dateStr = match[1]!
        const description = match[2]?.trim() || ""
        const amountStr = match[3]?.trim() || ""

        const date = parseDate(dateStr)
        const amount = parseAmount(amountStr)

        if (date && amount && description) {
          const type = amount >= 0 ? "INCOME" : "EXPENSE"
          const confidence = calculateConfidence(date, amount, description)

          return {
            date,
            description,
            amount: Math.abs(amount),
            type,
            confidence,
          }
        }
      }
    }

    return null
  } catch (error) {
    return null
  }
}

function findDateField(row: any): string | null {
  const dateFields = ["data", "date", "Data", "DATE", "dt", "DT"]

  for (const field of dateFields) {
    if (row[field] !== undefined) {
      return field
    }
  }

  // Tentar encontrar por padrão
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && /\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(value)) {
      return key
    }
  }

  return null
}

function findAmountField(row: any): string | null {
  const amountFields = ["valor", "value", "amount", "Valor", "VALUE", "AMOUNT", "v"]

  for (const field of amountFields) {
    if (row[field] !== undefined) {
      return field
    }
  }

  // Tentar encontrar por padrão numérico
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && /R?\$?\s*[\d.,]+/.test(value)) {
      return key
    }
  }

  return null
}

function findDescriptionField(row: any): string | null {
  const descFields = [
    "descrição",
    "description",
    "descricao",
    "Descrição",
    "DESCRIPTION",
    "desc",
    "historico",
  ]

  for (const field of descFields) {
    if (row[field] !== undefined) {
      return field
    }
  }

  // Se não encontrou, usar o primeiro campo string que não é data nem valor
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && value.length > 3) {
      const isDate = /\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(value)
      const isAmount = /R?\$?\s*[\d.,]+/.test(value)

      if (!isDate && !isAmount) {
        return key
      }
    }
  }

  return null
}

function parseDate(dateStr: string): Date | null {
  try {
    if (!dateStr) return null

    // Limpar string
    dateStr = dateStr.trim()

    // Padrões brasileiros comuns
    const patterns = [
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    ]

    for (const pattern of patterns) {
      const match = dateStr.match(pattern)
      if (match) {
        let year, month, day

        if (pattern.source.includes("YYYY")) {
          year = parseInt(match[1]!)
          month = parseInt(match[2]!) - 1
          day = parseInt(match[3]!)
        } else {
          day = parseInt(match[1]!)
          month = parseInt(match[2]!) - 1
          year = parseInt(match[3]!)
        }

        const date = new Date(year, month, day)

        // Validar data
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date
        }
      }
    }

    return null
  } catch (error) {
    return null
  }
}

function parseAmount(amountStr: string): number | null {
  try {
    if (!amountStr) return null

    // Limpar string
    amountStr = amountStr.trim()

    // Remover símbolos de moeda e espaços
    amountStr = amountStr.replace(/[R$\s]/g, "")

    // Identificar sinal
    let isNegative = false
    if (amountStr.startsWith("-") || amountStr.startsWith("(")) {
      isNegative = true
    }

    // Remover sinais e parênteses
    amountStr = amountStr.replace(/[-()]/g, "")

    // Converter formato brasileiro (1.234,56) para internacional (1234.56)
    amountStr = amountStr.replace(/\./g, "").replace(",", ".")

    const amount = parseFloat(amountStr)

    if (isNaN(amount)) {
      return null
    }

    return isNegative ? -amount : amount
  } catch (error) {
    return null
  }
}

function calculateConfidence(date: Date, amount: number, description: string): number {
  let confidence = 0.5 // Base confidence

  // Data válida e recente (últimos 2 anos)
  const now = new Date()
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
  if (date >= twoYearsAgo && date <= now) {
    confidence += 0.2
  }

  // Valor razoável (entre R$ 0,01 e R$ 100.000)
  if (amount >= 0.01 && amount <= 100000) {
    confidence += 0.1
  }

  // Descrição com tamanho razoável
  if (description.length >= 3 && description.length <= 100) {
    confidence += 0.1
  }

  // Descrição sem caracteres suspeitos
  if (!/[^a-zA-Z0-9\s\-.,]/.test(description)) {
    confidence += 0.1
  }

  return Math.min(confidence, 1.0)
}
