// @ts-nocheck
/**
 * Extração de texto de documentos (OCR/PDF/Excel) para indexação e busca.
 */

const MAX_EXTRACT_LENGTH = 100_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Method 1: pdfjs-dist with worker disabled (serverless-safe)
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
    // Disable worker — required for Node.js serverless (Vercel), otherwise hangs
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = ""
    }
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    })
    const pdf = await loadingTask.promise
    const parts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ")
      parts.push(pageText)
    }
    const text = parts.join("\n").slice(0, MAX_EXTRACT_LENGTH).trim()
    if (text.length >= 10) return text
    console.warn("pdfjs-dist extracted empty text, trying pdf-parse fallback")
  } catch (e) {
    console.warn("pdfjs-dist extraction failed:", e)
  }

  // Method 2: pdf-parse v2 (no test-file side-effects in this version)
  try {
    const pdfParseModule = await import("pdf-parse")
    const pdfParse = pdfParseModule.default ?? pdfParseModule
    const data = await pdfParse(buffer)
    const text = (data?.text ?? "").slice(0, MAX_EXTRACT_LENGTH).trim()
    if (text.length >= 10) return text
    console.warn("pdf-parse extracted empty text")
  } catch (e) {
    console.warn("pdf-parse extraction failed:", e)
  }

  return ""
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
