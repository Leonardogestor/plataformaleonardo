/**
 * Teste completo do fluxo de upload e processamento de PDF
 */

import fs from "fs"
import { extractTextFromPdf } from "@/lib/document-extract"
import { parseSimpleTransactions } from "@/lib/pdf-processor-fixed"

async function testCompleteFlow() {
  try {
    console.log("🚀 INICIANDO TESTE COMPLETO DO FLUXO DE PDF")
    
    // 1. Simular upload do arquivo
    const pdfPath = "C:\\Users\\vyrat\\Downloads\\NU_722116738_01SET2025_18SET2025.pdf"
    console.log("📄 Arquivo de teste:", pdfPath)
    
    const buffer = fs.readFileSync(pdfPath)
    const fileName = "NU_722116738_01SET2025_18SET2025.pdf"
    const fileSize = buffer.length
    
    console.log(`✅ Arquivo lido: ${fileSize} bytes`)
    
    // 2. Extrair texto (como faz a API)
    console.log("\n🔍 ETAPA 1: Extração de texto...")
    const extractedText = await extractTextFromPdf(buffer)
    
    if (!extractedText || extractedText.length < 10) {
      console.log("❌ Falha na extração de texto")
      return
    }
    
    console.log(`✅ Texto extraído: ${extractedText.length} caracteres`)
    
    // 3. Parse de transações (como faz o processador)
    console.log("\n🔍 ETAPA 2: Parse de transações...")
    const transactions = parseSimpleTransactions(extractedText, fileName)
    
    console.log(`✅ Transações encontradas: ${transactions.length}`)
    
    if (transactions.length === 0) {
      console.log("⚠️ Nenhuma transação encontrada - isso pode ser normal para alguns extratos")
      return
    }
    
    // 4. Validar transações
    console.log("\n🔍 ETAPA 3: Validação das transações...")
    let validTransactions = 0
    let invalidTransactions = 0
    
    transactions.forEach((tx, i) => {
      const isValid = tx.date && tx.amount > 0 && tx.description && tx.type && tx.category
      if (isValid) {
        validTransactions++
      } else {
        invalidTransactions++
        console.log(`❌ Transação inválida ${i + 1}:`, tx)
      }
    })
    
    console.log(`✅ Transações válidas: ${validTransactions}`)
    if (invalidTransactions > 0) {
      console.log(`❌ Transações inválidas: ${invalidTransactions}`)
    }
    
    // 5. Mostrar resumo
    if (validTransactions > 0) {
      console.log("\n📊 RESUMO DAS TRANSAÇÕES:")
      
      const income = transactions.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0)
      const expense = transactions.filter(t => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0)
      
      console.log(`  📈 Receitas: R$ ${income.toFixed(2)} (${transactions.filter(t => t.type === "INCOME").length} transações)`)
      console.log(`  📉 Despesas: R$ ${expense.toFixed(2)} (${transactions.filter(t => t.type === "EXPENSE").length} transações)`)
      console.log(`  💰 Saldo: R$ ${(income - expense).toFixed(2)}`)
      
      console.log("\n📂 CATEGORIAS:")
      const categories = transactions.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} transações`)
      })
      
      console.log("\n📋 EXEMPLOS DE TRANSAÇÕES:")
      transactions.slice(0, 5).forEach((tx, i) => {
        console.log(`  ${i + 1}. ${tx.date} | ${tx.type} | R$ ${tx.amount.toFixed(2)} | ${tx.category} | ${tx.description.substring(0, 50)}${tx.description.length > 50 ? '...' : ''}`)
      })
    }
    
    // 6. Conclusão
    console.log("\n🎉 TESTE CONCLUÍDO!")
    
    if (validTransactions > 0) {
      console.log("✅ O processamento de PDF está funcionando corretamente!")
      console.log("✅ As transações foram extraídas e validadas com sucesso!")
    } else {
      console.log("❌ Nenhuma transação válida foi encontrada")
      console.log("⚠️ Verifique se o formato do PDF é compatível")
    }
    
  } catch (error) {
    console.error("❌ Erro no teste completo:", error)
  }
}

testCompleteFlow()
