import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"
import { detectBankFromText } from "@/lib/bank-parsers"
import { parseTransactionsWithAI } from "@/lib/ai-transaction-parser"

/**
 * GET - Busca transacoes associadas a um documento processado.
 * Prioriza vínculo explícito por documentId, mantém fallback legado por janela de tempo
 * e, se ainda necessário, reconstrói uma prévia a partir do texto extraído.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    const document = await prisma.document.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        extractedText: true,
        createdAt: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    if (document.status === DocumentStatus.PROCESSING) {
      return NextResponse.json({
        status: DocumentStatus.PROCESSING,
        transactions: [],
        message: "Documento ainda está sendo processado",
      })
    }

    if (document.status === DocumentStatus.FAILED) {
      return NextResponse.json({
        status: DocumentStatus.FAILED,
        transactions: [],
        error: document.errorMessage || "Falha no processamento do documento",
      })
    }

    let transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        documentId: id,
      },
      orderBy: { date: "asc" },
      take: 2000,
    })

    if (transactions.length === 0) {
      const windowStart = new Date(document.createdAt.getTime() - 5 * 60 * 1000)
      const windowEnd = new Date(document.createdAt.getTime() + 5 * 60 * 1000)
      transactions = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          externalTransactionId: { startsWith: "pdf:" },
          createdAt: { gte: windowStart, lte: windowEnd },
        },
        orderBy: { date: "asc" },
        take: 2000,
      })
    }

    let formattedTransactions = transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split("T")[0],
      description: t.description,
      amount: t.type === "INCOME" ? Math.abs(Number(t.amount)) : -Math.abs(Number(t.amount)),
      type: t.type,
      category: t.category || "outros",
      subcategory: t.subcategory || "",
      documentId: id,
    }))

    if (
      formattedTransactions.length === 0 &&
      document.extractedText &&
      document.extractedText.length >= 10
    ) {
      try {
        const bank = detectBankFromText(document.extractedText)
        const parsedResult = await parseTransactionsWithAI(document.extractedText, "pdf", bank)

        formattedTransactions = parsedResult.transactions.map((transaction, index) => ({
          id: `parsed-${id}-${index}`,
          date: transaction.date,
          description: transaction.description,
          amount:
            transaction.type === "INCOME"
              ? Math.abs(Number(transaction.amount))
              : -Math.abs(Number(transaction.amount)),
          type: transaction.type,
          category: transaction.category || "outros",
          subcategory: "",
          documentId: id,
        }))
      } catch (parseError) {
        console.warn("Falha ao reconstruir transações a partir do texto extraído:", parseError)
      }
    }

    return NextResponse.json({
      status: DocumentStatus.COMPLETED,
      imported: transactions.length > 0,
      transactions: formattedTransactions,
      summary: {
        total: formattedTransactions.length,
        income: formattedTransactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0),
        expense: formattedTransactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      },
    })
  } catch (error) {
    console.error("Erro ao buscar transações do documento:", error)
    return NextResponse.json({ error: "Erro ao buscar transações do documento" }, { status: 500 })
  }
}
