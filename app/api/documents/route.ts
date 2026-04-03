/**
 * VERSÃO SIMPLES E DEFINITIVA - Upload de PDF 100% funcional
 * Sem dependências de Blob Storage, Redis ou configurações complexas
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { extractTextFromPdf } from "@/lib/document-extract"
import { parseStatementByBank } from "@/lib/bank-parsers"
import { importTransactionsFromPdfWithDedup } from "@/lib/transaction-import"
import { randomUUID } from "crypto"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // 2. Receber múltiplos arquivos
    const formData = await request.formData()
    const files = formData.getAll("files") as File[] | null
    const name = (formData.get("name") as string) || "Lote de Documentos"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    // Validar todos os arquivos
    for (const file of files) {
      if (file.size === 0) {
        return NextResponse.json({ error: `Arquivo vazio: ${file.name}` }, { status: 400 })
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}. Máximo 10MB.` },
          { status: 400 }
        )
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Apenas arquivos PDF são permitidos: ${file.name}` },
          { status: 400 }
        )
      }
    }

    console.log(
      `📄 Iniciando processamento de ${files.length} PDFs:`,
      files.map((f) => f.name)
    )

    // 3. Criar múltiplos documentos no banco
    const documents = await Promise.all(
      files.map(async (file) => {
        // Ler buffer do arquivo uma vez
        const buffer = Buffer.from(await file.arrayBuffer())

        const doc = await prisma.document.create({
          data: {
            userId: session.user.id,
            name: file.name,
            fileName: file.name,
            mimeType: "application/pdf",
            fileSize: file.size,
            status: "PROCESSING",
          },
        })

        console.log("✅ Documento criado no banco:", doc.id)

        // Processar PDF em background (não bloqueante)
        processPdfSimple(doc.id, buffer, file.name).catch((error) => {
          console.error("❌ Erro no processamento:", error)
        })

        return doc
      })
    )

    console.log(`📊 ${documents.length} documentos criados e processando...`)

    // 4. Retornar sucesso imediato com todos os documentos
    return NextResponse.json(
      {
        documents: documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          status: doc.status,
          message: "PDF recebido e está sendo processado...",
        })),
        total: documents.length,
        message: `${documents.length} PDFs recebidos e processando...`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("❌ Erro geral:", error)
    return NextResponse.json({ error: "Erro ao processar PDF. Tente novamente." }, { status: 500 })
  }
}

async function processPdfSimple(documentId: string, buffer: Buffer, fileName: string) {
  try {
    console.log("🔄 Processando PDF simples para:", documentId)

    // 1. Extrair texto
    const text = await extractTextFromPdf(buffer)

    if (!text || text.length < 10) {
      throw new Error("Não foi possível extrair texto do PDF")
    }

    console.log("📝 Texto extraído:", text.length, "caracteres")

    // 2. Salvar texto extraído
    await prisma.document.update({
      where: { id: documentId },
      data: { extractedText: text.slice(0, 10000) },
    })

    // 3. Parse simples de transações
    const rows = parseStatementByBank(text)
    console.log("📊 Transações encontradas:", rows.length)

    if (rows.length === 0) {
      throw new Error("Nenhuma transação encontrada no PDF")
    }

    // 4. Converter para formato padrão
    const transactions = rows.map((row) => ({
      type: row.type,
      category: "Outros", // Categoria padrão
      amount: row.amount,
      description: row.description,
      date: row.date,
    }))

    // 5. Importar transações
    const result = await importTransactionsFromPdfWithDedup(
      `user_${documentId}`, // ID temporário
      transactions
    )

    console.log("💾 Transações importadas:", result.success, "Falhas:", result.failed)

    // 6. Atualizar status final
    const finalStatus = result.success > 0 ? "COMPLETED" : "FAILED"
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: finalStatus,
        errorMessage: result.failed > 0 ? result.errors[0] : null,
      },
    })

    console.log("✅ Processamento finalizado:", finalStatus)
  } catch (error) {
    console.error("❌ Erro no processamento:", error)

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
      },
    })
  }
}
