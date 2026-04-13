import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DocumentStatus } from "@prisma/client"

/**
 * GET - Busca transações associadas a um documento processado.
 * Estratégia: todas as transações com externalTransactionId "pdf:" importadas
 * dentro de um intervalo de ±5 minutos do upload do documento.
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

    // Janela de ±5 min ao redor do upload para capturar as transações geradas sincronamente
    const windowStart = new Date(document.createdAt.getTime() - 5 * 60 * 1000)
    const windowEnd = new Date(document.createdAt.getTime() + 5 * 60 * 1000)

    let transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        externalTransactionId: { startsWith: "pdf:" },
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { date: "asc" },
      take: 2000,
    })

    // Fallback: se não encontrou na janela apertada, expande para 30 dias
    if (transactions.length === 0) {
      const thirtyDaysAgo = new Date(document.createdAt.getTime() - 30 * 24 * 60 * 60 * 1000)
      const thirtyDaysAfter = new Date(document.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      transactions = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          externalTransactionId: { startsWith: "pdf:" },
          createdAt: { gte: thirtyDaysAgo, lte: thirtyDaysAfter },
        },
        orderBy: { date: "asc" },
        take: 2000,
      })
    }

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split("T")[0],
      description: t.description,
      amount: t.type === "INCOME" ? Math.abs(Number(t.amount)) : -Math.abs(Number(t.amount)),
      category: t.category || "outros",
      subcategory: t.subcategory || "",
      documentId: id,
    }))

    return NextResponse.json({
      status: DocumentStatus.COMPLETED,
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
