import { prisma } from "@/lib/db"

export interface RawExtractionResult {
  success: boolean
  data?: any
  error?: string
}

export async function extractRaw(file: File, userId: string): Promise<RawExtractionResult> {
  try {
    console.log(`[EXTRACT] Extraindo dados do arquivo: ${file.name}, tipo: ${file.type}`)

    let rawText: string = ""
    let rawJson: any = null
    const source = file.name

    if (file.type === "application/pdf") {
      const result = await extractFromPDF(file)
      if (!result.success) return result
      rawText = result.text!
      rawJson = { type: "pdf", pages: result.pages }
    } else if (file.type === "text/csv") {
      const result = await extractFromCSV(file)
      if (!result.success) return result
      rawText = result.text!
      rawJson = { type: "csv", data: result.data }
    } else if (file.type.includes("sheet") || file.type.includes("excel")) {
      const result = await extractFromExcel(file)
      if (!result.success) return result
      rawText = result.text!
      rawJson = { type: "excel", data: result.data }
    } else {
      return {
        success: false,
        error: `Tipo de arquivo não suportado: ${file.type}`,
      }
    }

    // Salvar no banco de dados
    const rawTransaction = await prisma.rawTransaction.create({
      data: {
        userId,
        source,
        rawText,
        rawJson,
      },
    })

    console.log(`[EXTRACT] Dados brutos salvos com ID: ${rawTransaction.id}`)

    return {
      success: true,
      data: rawTransaction,
    }
  } catch (error) {
    console.error("[EXTRACT] Erro na extração:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function extractFromPDF(
  file: File
): Promise<{ success: boolean; text?: string; pages?: any; error?: string }> {
  try {
    // Para ambiente serverless, vamos usar uma abordagem simplificada
    // Em produção, você pode usar pdf-parse ou similar
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Simulação de extração de PDF - substituir com biblioteca real
    const text = buffer.toString("utf-8", 0, Math.min(buffer.length, 10000))

    return {
      success: true,
      text: `[PDF Content] ${file.name} - ${buffer.length} bytes`,
      pages: [{ number: 1, text: text.substring(0, 500) }],
    }
  } catch (error) {
    return {
      success: false,
      error: `Falha ao processar PDF: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

async function extractFromCSV(
  file: File
): Promise<{ success: boolean; text?: string; data?: any[]; error?: string }> {
  try {
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    if (lines.length === 0) {
      return {
        success: false,
        error: "Arquivo CSV vazio",
      }
    }

    const headers = lines[0]!.split(",").map((h) => h.trim().replace(/"/g, ""))
    const data = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = values[index] || ""
        })
        return obj
      })

    return {
      success: true,
      text,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: `Falha ao processar CSV: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

async function extractFromExcel(
  file: File
): Promise<{ success: boolean; text?: string; data?: any[]; error?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer()

    // Simulação de extração de Excel - substituir com xlsx library
    // Por enquanto, converte para texto simples
    const buffer = Buffer.from(arrayBuffer)
    const text = buffer.toString("utf-8", 0, Math.min(buffer.length, 10000))

    // Simular estrutura de dados Excel
    const data = [{ sheet: "Sheet1", rows: Math.floor(buffer.length / 100) }]

    return {
      success: true,
      text: `[Excel Content] ${file.name} - ${buffer.length} bytes`,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: `Falha ao processar Excel: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export function detectFileType(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop()

  switch (extension) {
    case "pdf":
      return "application/pdf"
    case "csv":
      return "text/csv"
    case "xls":
      return "application/vnd.ms-excel"
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    default:
      return "application/octet-stream"
  }
}
