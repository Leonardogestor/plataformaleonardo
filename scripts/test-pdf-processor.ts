import fs from "fs"
import { parseSimpleTransactions } from "@/lib/pdf-processor-fixed"

async function test() {
  try {
    const pdfPath = "C:\\Users\\vyrat\\Downloads\\NU_722116738_01SET2025_18SET2025.pdf"
    console.log("📄 Testando processador com:", pdfPath)

    // Ler e extrair texto do PDF
    const buffer = fs.readFileSync(pdfPath)
    console.log("✓ PDF carregado:", buffer.length, "bytes")

    // Extrair texto usando a função existente
    const { extractTextFromPdf } = await import("@/lib/document-extract")
    const text = await extractTextFromPdf(buffer)

    if (!text || text.length === 0) {
      console.log("❌ Falha na extração de texto")
      return
    }

    console.log("✅ Texto extraído:", text.length, "caracteres")
    console.log("\n📝 Preview do texto:")
    console.log("---")
    console.log(text.slice(0, 500))
    console.log("---\n")

    // Testar o parser de transações
    console.log("🔍 Testando parser de transações...")
    const transactions = parseSimpleTransactions(text, "NU_722116738_01SET2025_18SET2025.pdf")

    console.log(`📊 Encontradas ${transactions.length} transações:`)

    if (transactions.length > 0) {
      console.log("\n📋 Primeiras 50 linhas:")
      const lines = text.split("\n").filter((line) => line.trim().length > 0)
      lines.slice(0, 50).forEach((line, i) => {
        console.log(`${i.toString().padStart(2)}: ${line}`)
      })
      console.log(`\n📊 Total de linhas: ${lines.length}`)

      console.log("\n📈 Resumo:")
      const income = transactions
        .filter((t: any) => t.type === "INCOME")
        .reduce((sum: number, t: any) => sum + t.amount, 0)
      const expense = transactions
        .filter((t: any) => t.type === "EXPENSE")
        .reduce((sum: number, t: any) => sum + t.amount, 0)
      console.log(`  Receitas: R$ ${income.toFixed(2)}`)
      console.log(`  Despesas: R$ ${expense.toFixed(2)}`)
      console.log(`  Saldo: R$ ${(income - expense).toFixed(2)}`)

      console.log("\n📂 Categorias:")
      const categories = transactions.reduce(
        (acc: any, tx: any) => {
          acc[tx.category] = (acc[tx.category] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} transações`)
      })
    } else {
      console.log("⚠️ Nenhuma transação encontrada")
    }
  } catch (error) {
    console.error("❌ Erro no teste:", error)
  }
}

test()
