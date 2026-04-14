import fs from "fs"
import { extractTextFromPdf } from "@/lib/document-extract"

async function test() {
  try {
    const pdfPath = "C:\\Users\\vyrat\\Downloads\\NU_722116738_01SET2025_18SET2025.pdf"
    console.log("📄 Testando com:", pdfPath)

    const buffer = fs.readFileSync(pdfPath)
    console.log("✓ PDF carregado:", buffer.length, "bytes\n")

    console.log("🔍 Executando extractTextFromPdf()...")
    const text = await extractTextFromPdf(buffer)

    if (text && text.length > 0) {
      console.log("✅ SUCESSO! Texto extraído:", text.length, "caracteres")
      console.log("\nPreview dos primeiros 300 chars:")
      console.log("---")
      console.log(text.slice(0, 300))
      console.log("---")
    } else {
      console.log("❌ FALHA! Sem texto extraído")
    }
  } catch (e) {
    console.error("Erro:", e)
  }
}

test()
