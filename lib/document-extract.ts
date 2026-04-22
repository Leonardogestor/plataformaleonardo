let pdfjsLib: any
let createWorker: any

const MAX_LENGTH = 80_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log(`[EXTRACT] Buffer recebido: ${buffer.length} bytes`)
  try {
    const mod = await import("pdf-parse")
    const parse = typeof mod.default === "function" ? mod.default : mod
    const data = await (typeof parse === "function" ? parse(buffer) : parse.default(buffer))
    const text = (data.text ?? "").trim()
    console.log(`[EXTRACT] Texto extraído: ${text.length} chars`)
    if (text.length > 50) return text.slice(0, MAX_LENGTH)
    console.warn("[EXTRACT] Texto muito curto, PDF pode ser imagem")
    return ""
  } catch (e) {
    console.error("[EXTRACT] Erro pdf-parse:", e instanceof Error ? e.message : String(e))
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

export async function extractTextFromPdfWithOcr(buffer: Buffer): Promise<string> {
  // Primeiro tenta extrair texto normalmente
  const text = await extractTextFromPdf(buffer)
  if (text && text.length > 50) return text

  // Se falhar, tenta OCR página a página
  console.warn("[EXTRACT] Tentando OCR página a página (PDF provavelmente é imagem)")
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  let ocrText = ""
  const worker = await createWorker()
  await worker.loadLanguage("por")
  await worker.initialize("por")
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = require("canvas")
    const c = canvas.createCanvas(viewport.width, viewport.height)
    const ctx = c.getContext("2d")
    await page.render({ canvasContext: ctx, viewport }).promise
    const img = c.toBuffer()
    const {
      data: { text: pageText },
    } = await worker.recognize(img)
    ocrText += pageText + "\n"
  }
  await worker.terminate()
  return ocrText.trim().slice(0, MAX_LENGTH)
}
