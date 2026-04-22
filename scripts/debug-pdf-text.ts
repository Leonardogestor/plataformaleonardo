import fs from "fs"

async function debugPdfText() {
  try {
    const pdfPath = "C:\\Users\\vyrat\\Downloads\\NU_722116738_01SET2025_18SET2025.pdf"
    console.log("📄 Analisando texto completo do PDF:", pdfPath)

    const buffer = fs.readFileSync(pdfPath)
    const { extractTextFromPdf } = await import("@/lib/document-extract")
    const text = await extractTextFromPdf(buffer)

    console.log("📝 Texto completo (primeiros 2000 caracteres):")
    console.log("=" * 80)
    console.log(text.slice(0, 2000))
    console.log("=" * 80)
    
    console.log("\n📋 Linhas individuais:")
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    lines.slice(0, 30).forEach((line, i) => {
      console.log(`${i.toString().padStart(2)}: ${line}`)
    })
    
    console.log("\n🔍 Procurando padrões de valor:")
    const valuePatterns = [
      /\d+,\d{2}/g,
      /R\$\s*\d+,\d{2}/g,
      /\d+\.\d+,\d{2}/g
    ]
    
    valuePatterns.forEach((pattern, i) => {
      const matches = text.match(pattern)
      console.log(`Padrão ${i + 1}: ${matches ? matches.length : 0} ocorrências`)
      if (matches) {
        console.log(`  Exemplos: ${matches.slice(0, 5).join(', ')}`)
      }
    })
    
    console.log("\n🔍 Procurando padrões de data:")
    const datePatterns = [
      /\d{2}\/\d{2}/g,
      /\d{2}\/\d{2}\/\d{4}/g,
      /\d{2}\s+\w{3}\s+\d{4}/g
    ]
    
    datePatterns.forEach((pattern, i) => {
      const matches = text.match(pattern)
      console.log(`Padrão ${i + 1}: ${matches ? matches.length : 0} ocorrências`)
      if (matches) {
        console.log(`  Exemplos: ${matches.slice(0, 5).join(', ')}`)
      }
    })

  } catch (error) {
    console.error("❌ Erro:", error)
  }
}

debugPdfText()
