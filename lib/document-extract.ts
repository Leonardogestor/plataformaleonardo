/**
 * Extração de texto de documentos (OCR/PDF/Excel) para indexação e busca.
 */

const MAX_EXTRACT_LENGTH = 100_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default
    const data = await pdfParse(buffer)
    const text = typeof data?.text === "string" ? data.text : ""
    return text.slice(0, MAX_EXTRACT_LENGTH).trim()
  } catch (e) {
    console.warn("pdf-parse extraction failed:", e)
    return ""
  }
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import("xlsx")
    const workbook = XLSX.read(buffer, { type: "buffer", raw: true })
    const parts: string[] = []
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name]
      if (sheet) {
        const text = XLSX.utils.sheet_to_txt(sheet, { blankrows: false, strip: true })
        if (text) parts.push(`[${name}]\n${text}`)
      }
    }
    return parts.join("\n\n").slice(0, MAX_EXTRACT_LENGTH).trim()
  } catch (e) {
    console.warn("xlsx extraction failed:", e)
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
