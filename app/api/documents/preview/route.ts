/**
 * POST /api/documents/preview
 * Estágio 1 do Zero-Fault Ingestion: extrai transações de PDFs e retorna
 * para revisão no frontend — zero escritas no banco de dados.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { extractTextFromPdf } from "@/lib/document-extract"
import { extractTransactionsFromPdfWithAI } from "@/lib/pdf-ai-extractor"
import { hybridParseTransactions, convertToNormalizedTransaction } from "@/lib/ai-transaction-parser"
import { detectBankFromText } from "@/lib/bank-parsers"

export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 10

export interface StagedTransaction {
  tempId: string
  date: string        // YYYY-MM-DD
  amount: number      // sempre positivo
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT"
  category: string
  description: string
}

export interface PreviewFileResult {
  name: string
  size: number
  transactions: StagedTransaction[]
  error: string | null
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Falha ao ler arquivos enviados" }, { status: 400 })
  }

  const rawFiles = [...formData.getAll("file"), ...formData.getAll("files")]
  const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0)

  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Máximo ${MAX_FILES} arquivos por vez` }, { status: 400 })
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `"${file.name}" excede 10MB` },
        { status: 400 }
      )
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: `Apenas PDFs são suportados. Arquivo recusado: ${file.name}` },
        { status: 400 }
      )
    }
  }

  const results: PreviewFileResult[] = await Promise.all(
    files.map(async (file, fileIdx): Promise<PreviewFileResult> => {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await extractTextFromPdf(buffer)

        if (!text || text.length < 50) {
          return { name: file.name, size: file.size, transactions: [], error: "Texto não extraível do PDF" }
        }

        // Tenta OpenAI primeiro, cai para parser local se não houver API key ou resultado vazio
        let rawTxs: Array<{ date: string; description: string; amount: number; type: "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT"; category: string }> = []

        const aiResult = await extractTransactionsFromPdfWithAI(text)
        if (aiResult.transactions.length > 0) {
          rawTxs = aiResult.transactions
        } else {
          const bank = detectBankFromText(text)
          const localResult = await hybridParseTransactions(text, "pdf", bank)
          rawTxs = localResult.transactions.map((t) => {
            const n = convertToNormalizedTransaction(t)
            return {
              date: n.date,
              description: n.description,
              amount: n.amount,
              type: n.type,
              category: n.category,
            }
          })
        }

        if (rawTxs.length === 0) {
          return { name: file.name, size: file.size, transactions: [], error: "Nenhuma transação identificada" }
        }

        const transactions: StagedTransaction[] = rawTxs.map((t, idx) => ({
          tempId: `${fileIdx}-${idx}-${Date.now()}`,
          date: t.date,
          amount: Math.abs(t.amount),
          type: t.type,
          category: t.category?.trim() || "Outros",
          description: t.description?.slice(0, 200) || "Sem descrição",
        }))

        return { name: file.name, size: file.size, transactions, error: null }
      } catch (err) {
        return {
          name: file.name,
          size: file.size,
          transactions: [],
          error: err instanceof Error ? err.message : "Erro ao processar arquivo",
        }
      }
    })
  )

  return NextResponse.json({ files: results })
}
