import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * GET - Busca transações extraídas de um documento processado
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    // Verificar se o documento existe e pertence ao usuário
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        errorMessage: true,
        extractedText: true,
        syncLogs: {
          where: { documentId: id },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            transactionsProcessed: true,
            error: true,
            startedAt: true,
            finishedAt: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    // Se o documento ainda está processando, retornar status
    if (document.status === "PROCESSING") {
      return NextResponse.json({
        status: "PROCESSING",
        transactions: [],
        message: "Documento ainda está sendo processado",
      })
    }

    // Se o processamento falhou, retornar erro
    if (document.status === "FAILED") {
      return NextResponse.json({
        status: "FAILED",
        transactions: [],
        error: document.errorMessage || "Falha no processamento do documento",
      })
    }

    // Buscar transações associadas a este documento
    // Vamos buscar transações importadas de PDF mais recentes do usuário
    // usando uma janela de tempo maior (7 dias) para garantir que encontramos todas
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: sevenDaysAgo }, // Janela de 7 dias
        externalTransactionId: { startsWith: "pdf:" }, // Importadas de PDF
      },
      orderBy: { createdAt: "desc" },
      take: 1000, // Limitar para não sobrecarregar
    })

    // Se não encontrar transações, tentar com janela maior (30 dias)
    let finalTransactions = transactions
    if (transactions.length === 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      finalTransactions = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: thirtyDaysAgo },
          externalTransactionId: { startsWith: "pdf:" },
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      })
    }

    // Formatar as transações para o formato esperado pelo frontend
    const formattedTransactions = finalTransactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split("T")[0], // YYYY-MM-DD
      description: t.description,
      amount: t.type === "INCOME" ? Math.abs(Number(t.amount)) : -Math.abs(Number(t.amount)),
      category: t.category?.toLowerCase() || "outros",
      subcategory: t.subcategory || "",
      originalCategory: t.category?.toLowerCase() || "outros",
      confidence: 0.8, // Valor padrão já que não temos no modelo Transaction
      documentId: id,
    }))

    return NextResponse.json({
      status: "COMPLETED",
      transactions: formattedTransactions,
      summary: {
        total: formattedTransactions.length,
        processed: document.syncLogs[0]?.transactionsProcessed || 0,
        processingTime: document.syncLogs[0]?.finishedAt
          ? document.syncLogs[0].finishedAt.getTime() - document.syncLogs[0].startedAt.getTime()
          : null,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar transações do documento:", error)
    return NextResponse.json({ error: "Erro ao buscar transações do documento" }, { status: 500 })
  }
}
