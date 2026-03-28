import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// PDF parsing library - temporarily commented due to import issues
// import * as pdfParse from "pdf-parse"
// Excel parsing library
import * as XLSX from "xlsx"

interface ParsedInvestment {
  name: string
  type: string
  amount: number
  currentValue: number
  institution: string
  ticker?: string
  acquiredAt: string
  profitability?: number
  quantity?: number
  maturityDate?: string
}

interface UploadResult {
  success: boolean
  investments: ParsedInvestment[]
  errors: string[]
  warnings: string[]
  summary: {
    total: number
    processed: number
    imported: number
    updated: number
  }
}

// Investment type mapping
const mapInvestmentType = (name: string, description: string): string => {
  const lowerName = name.toLowerCase()
  const lowerDesc = description.toLowerCase()

  if (lowerName.includes("tesouro") || lowerDesc.includes("tesouro")) return "BONDS"
  if (lowerName.includes("ação") || lowerName.includes("stock") || lowerDesc.includes("ação"))
    return "STOCKS"
  if (lowerName.includes("fundo") || lowerDesc.includes("fundo")) return "FUNDS"
  if (lowerName.includes("cripto") || lowerName.includes("bitcoin") || lowerDesc.includes("cripto"))
    return "CRYPTO"
  if (lowerName.includes("imóvel") || lowerName.includes("imovel") || lowerDesc.includes("imóvel"))
    return "REAL_ESTATE"
  if (
    lowerName.includes("cdb") ||
    lowerName.includes("lci") ||
    lowerName.includes("lca") ||
    lowerDesc.includes("renda fixa")
  )
    return "FIXED_INCOME"

  return "OTHER"
}

// Institution mapping
const mapInstitution = (name: string): string => {
  const lowerName = name.toLowerCase()

  if (lowerName.includes("xp") || lowerName.includes("xp invest")) return "XP Investimentos"
  if (lowerName.includes("nu") || lowerName.includes("nubank")) return "Nu Invest"
  if (lowerName.includes("rico") || lowerName.includes("rico invest")) return "Rico Investimentos"
  if (lowerName.includes("inter") || lowerName.includes("btg")) return "BTG Pactual"
  if (lowerName.includes("itau") || lowerName.includes("itaú")) return "Itaú"
  if (lowerName.includes("bradesco")) return "Bradesco"
  if (lowerName.includes("santander")) return "Santander"
  if (lowerName.includes("caixa")) return "Caixa"
  if (lowerName.includes("bancodobrasil") || lowerName.includes("banco do brasil"))
    return "Banco do Brasil"

  return name
}

// Parse PDF file - temporarily disabled due to import issues
async function parsePDF(buffer: Buffer): Promise<ParsedInvestment[]> {
  try {
    // const data = await pdfParse(buffer)
    // const text = data.text

    // For now, return empty array for PDF files
    console.log("PDF parsing temporarily disabled")
    return []

    /*
    // Simple text parsing - you may need to adjust based on your PDF format
    const lines = text.split("\n").filter((line) => line.trim())
    const investments: ParsedInvestment[] = []

    // Look for patterns like "Tesouro Selic 2029", "R$ 1.000,00", etc.
    let currentInvestment: Partial<ParsedInvestment> = {}

    for (const line of lines) {
      const cleanLine = line.trim()

      // Skip headers and empty lines
      if (!cleanLine || cleanLine.includes("Saldo") || cleanLine.includes("Total")) continue

      // Extract monetary values
      const moneyMatch = cleanLine.match(/R\$\s*([\d.,]+)/)
      if (moneyMatch) {
        const value = parseFloat(moneyMatch[1].replace(".", "").replace(",", "."))
        if (!currentInvestment.amount) {
          currentInvestment.amount = value
        } else if (!currentInvestment.currentValue) {
          currentInvestment.currentValue = value
        }
      }

      // Extract investment name (simple heuristic)
      if (cleanLine.length > 3 && !moneyMatch && !cleanLine.includes("R$")) {
        currentInvestment.name = cleanLine
        currentInvestment.type = mapInvestmentType(cleanLine, "")
        currentInvestment.institution = mapInstitution(cleanLine)
      }

      // If we have enough data, save and reset
      if (currentInvestment.name && currentInvestment.amount && currentInvestment.currentValue) {
        investments.push({
          name: currentInvestment.name!,
          type: currentInvestment.type!,
          amount: currentInvestment.amount!,
          currentValue: currentInvestment.currentValue!,
          institution: currentInvestment.institution || "Desconhecida",
          acquiredAt: new Date().toISOString().split("T")[0],
        } as ParsedInvestment)

        currentInvestment = {}
      }
    }

    return investments
    */
  } catch (error) {
    console.error("PDF parsing error:", error)
    throw new Error("Falha ao ler arquivo PDF")
  }
}

// Parse Excel/CSV file
async function parseExcel(buffer: Buffer): Promise<ParsedInvestment[]> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error("Arquivo não contém planilhas")
    }
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      throw new Error("Planilha não encontrada")
    }
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (data.length < 2) {
      throw new Error("Arquivo não contém dados suficientes")
    }

    const headers = data[0]?.map((h: any) => String(h).toLowerCase().trim()) || []
    const investments: ParsedInvestment[] = []

    // Find column indices
    const nameIdx = headers.findIndex(
      (h: string) => h.includes("nome") || h.includes("ativo") || h.includes("investment")
    )
    const typeIdx = headers.findIndex(
      (h: string) => h.includes("tipo") || h.includes("type") || h.includes("category")
    )
    const amountIdx = headers.findIndex(
      (h: string) => h.includes("investido") || h.includes("amount") || h.includes("valor")
    )
    const currentValueIdx = headers.findIndex(
      (h: string) => h.includes("atual") || h.includes("current") || h.includes("valor atual")
    )
    const institutionIdx = headers.findIndex(
      (h: string) => h.includes("institu") || h.includes("broker")
    )
    const dateIdx = headers.findIndex((h: string) => h.includes("data") || h.includes("date"))

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.every((cell: any) => !cell)) continue

      try {
        const investment: ParsedInvestment = {
          name: String(row[nameIdx] || row[0] || ""),
          type: mapInvestmentType(String(row[typeIdx] || ""), String(row[nameIdx] || row[0] || "")),
          amount: parseFloat(
            String(row[amountIdx] || "0")
              .replace(/[R$\s.]/g, "")
              .replace(",", ".")
          ),
          currentValue: parseFloat(
            String(row[currentValueIdx] || row[amountIdx] || "0")
              .replace(/[R$\s.]/g, "")
              .replace(",", ".")
          ),
          institution: mapInstitution(String(row[institutionIdx] || "Desconhecida")),
          acquiredAt: (row[dateIdx]
            ? new Date(String(row[dateIdx])).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]) as string,
        }

        if (investment.name && investment.amount > 0) {
          investments.push(investment)
        }
      } catch (error) {
        console.warn(`Error parsing row ${i}:`, error)
      }
    }

    return investments
  } catch (error) {
    console.error("Excel parsing error:", error)
    throw new Error("Falha ao ler arquivo Excel/CSV")
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads", "investments")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file temporarily
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filepath = join(uploadDir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Parse file based on type
    let investments: ParsedInvestment[] = []
    const errors: string[] = []
    const warnings: string[] = []

    try {
      if (file.type === "application/pdf") {
        investments = await parsePDF(buffer)
        warnings.push("Arquivos PDF podem precisar de validação manual dos dados")
      } else if (
        file.type.includes("sheet") ||
        file.type.includes("excel") ||
        file.name.endsWith(".csv")
      ) {
        investments = await parseExcel(buffer)
      } else {
        throw new Error("Formato de arquivo não suportado")
      }
    } catch (parseError) {
      errors.push(parseError instanceof Error ? parseError.message : "Erro ao processar arquivo")
    }

    // Save investments to database
    let imported = 0
    let updated = 0

    for (const investment of investments) {
      try {
        // Check if investment already exists
        const existingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/investments`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (existingResponse.ok) {
          const existing = await existingResponse.json()
          const duplicate = existing.find(
            (inv: any) =>
              inv.name.toLowerCase() === investment.name.toLowerCase() &&
              inv.institution.toLowerCase() === investment.institution.toLowerCase()
          )

          if (duplicate) {
            // Update existing
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/investments/${duplicate.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...investment,
                amount: String(investment.amount),
                currentValue: String(investment.currentValue),
                quantity: investment.quantity ? String(investment.quantity) : undefined,
                profitability: investment.profitability
                  ? String(investment.profitability)
                  : undefined,
              }),
            })
            updated++
          } else {
            // Create new
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/investments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...investment,
                amount: String(investment.amount),
                currentValue: String(investment.currentValue),
                quantity: investment.quantity ? String(investment.quantity) : undefined,
                profitability: investment.profitability
                  ? String(investment.profitability)
                  : undefined,
              }),
            })
            imported++
          }
        }
      } catch (error) {
        errors.push(`Erro ao salvar investimento "${investment.name}": ${error}`)
      }
    }

    const result: UploadResult = {
      success: errors.length === 0,
      investments,
      errors,
      warnings,
      summary: {
        total: investments.length,
        processed: investments.length,
        imported,
        updated,
      },
    }

    // Clean up temporary file
    try {
      await writeFile(filepath, buffer) // Keep for debugging
    } catch (cleanupError) {
      console.warn("Could not clean up temporary file:", cleanupError)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}
