const MAX_LENGTH = 80_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log(`[EXTRACT] Buffer: ${buffer.length} bytes`)
  try {
    const mod = await import("pdf-parse")
    const parse = typeof mod.default === "function" ? mod.default : (mod as any)
    const data = await parse(buffer)
    const text = (data.text ?? "").trim()
    console.log(`[EXTRACT] Texto extraido: ${text.length} chars`)
    return text.length > 50 ? text.slice(0, MAX_LENGTH) : ""
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

export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") return extractTextFromPdf(buffer)
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
    return extractTextFromExcel(buffer)
  return ""
}
