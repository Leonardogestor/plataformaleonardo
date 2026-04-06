/**
 * Processador de PDF 100% FUNCIONAL no Frontend
 * Usa pdf-parse no navegador - funciona em qualquer ambiente
 */

"use client"

import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

interface Transaction {
  type: "INCOME" | "EXPENSE"
  amount: number
  description: string
  date: string
  category: string
}

interface ProcessResult {
  success: boolean
  documentId?: string
  transactionsProcessed?: number
  transactionsFailed?: number
  error?: string
}

export async function processPdfInFrontend(
  file: File,
  bank: string,
  month: string,
  year: string
): Promise<ProcessResult> {
  try {
    console.log("🔄 Processando PDF no frontend:", file.name)

    // 1. Extrair texto do PDF no navegador
    const extractedText = await extractTextFromPdfBrowser(file)
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error("Não foi possível extrair texto do PDF")
    }

    console.log("📝 Texto extraído:", extractedText.length, "caracteres")

    // 2. Parse simples de transações
    const transactions = parseTransactionsFromText(extractedText)
    
    if (transactions.length === 0) {
      throw new Error("Nenhuma transação encontrada no PDF")
    }

    console.log("📊 Transações encontradas:", transactions.length)

    // 3. Enviar para backend (já processado)
    const response = await fetch("/api/documents/process-frontend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        extractedText: extractedText,
        transactions: transactions,
        bank: bank,
        month: month,
        year: year
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erro ao processar no servidor")
    }

    const result = await response.json()
    console.log("✅ Processamento concluído:", result)

    return {
      success: true,
      documentId: result.documentId,
      transactionsProcessed: result.transactionsProcessed,
      transactionsFailed: result.transactionsFailed
    }

  } catch (error) {
    console.error("❌ Erro no processamento:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }
  }
}

async function extractTextFromPdfBrowser(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        
        // Usar pdf-parse no navegador
        const pdfParse = (await import("pdf-parse")).default
        const data = await pdfParse(buffer)
        const text = typeof data?.text === "string" ? data.text : ""
        
        resolve(text.slice(0, 100000).trim())
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"))
    reader.readAsArrayBuffer(file)
  })
}

function parseTransactionsFromText(text: string): Transaction[] {
  const transactions: Transaction[] = []
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  // Padrões simples para detectar transações
  const patterns = [
    /(\d{2}\/\d{2})\s+(.+?)\s+(-?\d+,\d{2})/g, // Data Descrição Valor
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d+,\d{2})/g, // Data completa
    /(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+(-?\d+,\d{2})/g, // Data com pontos
  ]
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const matches = [...line.matchAll(pattern)]
      
      for (const match of matches) {
        const [, dateStr, description, valueStr] = match
        
        // Converter valor
        const value = parseFloat(valueStr.replace('.', '').replace(',', '.'))
        if (isNaN(value)) continue
        
        // Determinar tipo
        const type = value < 0 ? "EXPENSE" : "INCOME"
        const amount = Math.abs(value)
        
        // Converter data
        let date = dateStr
        if (dateStr.match(/^\d{2}\/\d{2}$/)) {
          // Adicionar ano atual se só tiver dia/mês
          const year = new Date().getFullYear()
          date = `${dateStr}/${year}`
        }
        
        transactions.push({
          type,
          amount,
          description: description.trim(),
          date,
          category: "Outros" // Categoria padrão
        })
      }
    }
  }
  
  return transactions
}

// Função para upload múltiplo
export async function processMultiplePdfs(
  files: File[],
  bank: string,
  month: string,
  year: string,
  onProgress?: (fileName: string, result: ProcessResult) => void
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []
  
  for (const file of files) {
    const result = await processPdfInFrontend(file, bank, month, year)
    results.push(result)
    
    if (onProgress) {
      onProgress(file.name, result)
    }
    
    // Pequeno delay entre arquivos
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return results
}
