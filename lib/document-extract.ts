import pdfParse from "pdf-parse"

const MAX_LENGTH = 80_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log(`[EXTRACT] Iniciando extração, buffer: ${buffer.length} bytes`)
  try {
    const data = await pdfParse(buffer)
    const text = (data.text ?? "").trim()
    console.log(`[EXTRACT] Texto extraído: ${text.length} chars`)
    if (text.length > 50) return text.slice(0, MAX_LENGTH)
    console.warn("[EXTRACT] Texto muito curto, PDF pode ser imagem")
    return ""
  } catch (e) {
    console.error("[EXTRACT] Erro:", e instanceof Error ? e.message : String(e))
    return ""
  }
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import("xlsx")
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const parts: string[] = []
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name]
      if (sheet) parts.push(XLSX.utils.sheet_to_csv(sheet))
    }
    return parts.join("\n\n").slice(0, MAX_LENGTH).trim()
  } catch {
    return buffer.toString("utf-8").slice(0, MAX_LENGTH).trim()
  }
}
