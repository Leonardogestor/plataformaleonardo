// @ts-nocheck
/**
 * Extração confiável de texto para PDFs - Nubank, Itaú, e outros bancos.
 * Usa pdfjs-dist para máxima compatibilidade.
 */

const MAX_EXTRACT_LENGTH = 100_000

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log(`[PDF] Iniciando extração de PDF (${buffer.length} bytes)`)

  // Primary: pdfjs-dist (excelente compatibilidade)
  try {
    console.log(`[PDF] Tentando pdfjs-dist...`)
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const getDocument = pdfjs.getDocument

    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      verbosity: 0,
    })

    const pdf = await loadingTask.promise
    console.log(`[PDF] ✓ Documento carregado: ${pdf.numPages} páginas`)

    const parts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent({ normalizedStrings: true })
        const pageText = (content.items ?? [])
          .filter((item: any) => item.str && item.str.trim())
          .map((item: any) => item.str)
          .join(" ")

        if (pageText.trim().length > 0) {
          parts.push(pageText)
          console.log(`[PDF]   Página ${i}: ${pageText.length} chars`)
        }
      } catch (pageErr) {
        console.warn(`[PDF] ⚠️ Erro na página ${i}:`, pageErr instanceof Error ? pageErr.message : "desconhecido")
      }
    }

    const text = parts.join("\n").trim()
    console.log(`[PDF] ✅ SUCESSO! Total: ${text.length} caracteres`)

    if (text.length >= 10) {
      return text.slice(0, MAX_EXTRACT_LENGTH)
    } else {
      console.warn(`[PDF] ⚠️ Texto extraído muito curto: ${text.length} chars`)
      return "" // Pode ser PDF vazio ou protegido
    }
  } catch (e) {
    console.error(
      `[PDF] ❌ Falha na extração: ${e instanceof Error ? e.message : String(e)}`
    )
    return ""
  }
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import("xlsx")

    // Tenta ler como workbook (XLSX/XLS) primeiro
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

    // Se falhar, tenta como CSV
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
