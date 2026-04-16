/**
 * Extração confiável de texto para PDFs - Nubank, Itaú, e outros bancos.
 * Usa pdf-parse para máxima estabilidade no Node.js/Vercel serverless.
 */

const MAX_EXTRACT_LENGTH = 100_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log(`[PDF] Iniciando extração de PDF (${buffer.length} bytes)`)

  try {
    console.log(`[PDF] Tentando pdf-parse...`)
    // pdf-parse é estável no Node.js/Vercel - sem dependência de Worker ou eval
    const pdfModule = await import("pdf-parse")
    const pdfParse = pdfModule.default ?? (pdfModule as any)
    const data = await pdfParse(buffer)
    const text = (data.text ?? "").trim()
    console.log(`[PDF]  SUCESSO! Total: ${text.length} caracteres (${data.numpages} páginas)`)
    return text.slice(0, MAX_EXTRACT_LENGTH)
  } catch (e) {
    console.error(`[PDF]  Falha na extração: ${e instanceof Error ? e.message : String(e)}`)
    return ""
  }
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import("xlsx")

    try {
      const workbook = XLSX.read(buffer, { type: "buffer", raw: true })
      const parts: string[] = []
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name]
        if (sheet) {
          const text = XLSX.utils.sheet_to_txt(sheet, { blankrows: false, strip: true })
          if (text) parts.push(`[${name}]\n${text}`)
        }
      }
      const result = parts.join("\n\n").slice(0, MAX_EXTRACT_LENGTH).trim()
      if (result.length > 0) return result
    } catch (xlsxError) {
      console.warn("XLSX parsing failed, trying CSV:", xlsxError)
    }

    const text = buffer.toString("utf-8")
    if (text.trim().length > 0) {
      return text.slice(0, MAX_EXTRACT_LENGTH).trim()
    }

    return ""
  } catch (e) {
    console.warn("Excel/CSV extraction failed:", e)
    return ""
  }
}

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const Tesseract = await import("tesseract.js")
    const { data } = await Tesseract.recognize(buffer, "por+eng", {
      logger: () => {},
    })
    const text = data?.text ?? ""
    return text.slice(0, MAX_EXTRACT_LENGTH).trim()
  } catch (e) {
    console.warn("tesseract.js OCR failed:", e)
    return ""
  }
}

export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractTextFromPdf(buffer)
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return extractTextFromExcel(buffer)
  }
  if (mimeType === "image/jpeg" || mimeType === "image/png") {
    return extractTextFromImage(buffer)
  }
  return ""
}
