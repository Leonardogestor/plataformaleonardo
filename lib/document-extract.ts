// @ts-nocheck
/**
 * Extração confiável de texto para PDFs:
 * Tenta pdfjs-dist PRIMEIRO (mais rápido), fallback para pdf-parse (mais robusto).
 */

const MAX_EXTRACT_LENGTH = 100_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // FORCE-MODE: Attempt 1 - pdfjs-dist (optimized for serverless)
  let text = ""
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
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
      const pageText = (content.items ?? [])
        .map((item: any) => item.str ?? "")
        .join(" ")
      parts.push(pageText)
    }
    text = parts.join("\n").trim()
    if (text.length >= 10) {
      console.info(`[PDF] pdfjs-dist OK: ${text.length} chars`)
      return text.slice(0, MAX_EXTRACT_LENGTH)
    }
  } catch (e) {
    console.warn(`[PDF] pdfjs-dist failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  // FORCE-MODE: Attempt 2 - pdf-parse default export (more robust)
  try {
    const pdfParseModule = await import("pdf-parse")
    const pdfParse = pdfParseModule.default ?? pdfParseModule
    const pdfData = await pdfParse(buffer)
    text = (pdfData?.text ?? "").trim()
    if (text.length >= 10) {
      console.info(`[PDF] pdf-parse OK: ${text.length} chars`)
      return text.slice(0, MAX_EXTRACT_LENGTH)
    }
  } catch (e) {
    console.warn(`[PDF] pdf-parse attempt 1 failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  // FORCE-MODE: Attempt 3 - retry pdf-parse with buffer clone
  try {
    const pdfParseModule = await import("pdf-parse")
    const pdfParse = pdfParseModule.default ?? pdfParseModule
    const pdfData = await pdfParse(Buffer.from(buffer))
    text = (pdfData?.text ?? "").trim()
    if (text.length >= 10) {
      console.info(`[PDF] pdf-parse (cloned) OK: ${text.length} chars`)
      return text.slice(0, MAX_EXTRACT_LENGTH)
    }
  } catch (e) {
    console.warn(`[PDF] pdf-parse attempt 2 failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  console.error(`[PDF] ALL METHODS FAILED - returning empty string`)
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
