import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

/**
 * GET – List import sessions for the current user
 * Returns organized import sessions by period with document counts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar todos os documentos do usuário agrupados por período
    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        extractedText: true,
        // Campos adicionais para organização
        // Se não tiver bankName e period no modelo, vamos extrair do nome
      },
    })

    // Agrupar documentos por período (baseado no nome do documento)
    const groupedByPeriod = documents.reduce(
      (acc, doc) => {
        // Tentar extrair período do nome (ex: "Extrato Nubank - Fevereiro 2026")
        const periodMatch = doc.name.match(/- (.+?) \d{4}/)
        const period = periodMatch ? periodMatch[1] : "Período não identificado"
        const yearMatch = doc.name.match(/\d{4}/)
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear()

        // Tentar extrair banco do nome
        const bankMatch = doc.name.match(/Extrato (.+?) -/)
        const bankName = bankMatch ? bankMatch[1] : "Banco não identificado"

        const key = `${period}_${year}`

        if (!acc[key]) {
          acc[key] = {
            id: key,
            period: `${period} ${year}`,
            year,
            month: period,
            documents: [],
            status: "SETUP" as const,
            createdAt: doc.createdAt,
          }
        }

        // Contar transações (se tiver no campo extraído)
        const transactionCount = doc.extractedText
          ? (doc.extractedText.match(/transaction_id/g) || []).length
          : 0

        acc[key].documents.push({
          ...doc,
          bankName,
          period: `${period} ${year}`,
          transactionCount,
        })

        // Atualizar status baseado nos documentos
        const allCompleted = acc[key].documents.every((d: any) => d.status === "COMPLETED")
        const anyFailed = acc[key].documents.some((d: any) => d.status === "FAILED")

        if (allCompleted) {
          acc[key].status = "COMPLETED" as const
        } else if (anyFailed) {
          acc[key].status = "FAILED" as const
        } else {
          acc[key].status = "PROCESSING" as const
        }

        return acc
      },
      {} as Record<string, any>
    )

    // Converter para array e ordenar por data
    const imports = Object.values(groupedByPeriod).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json(imports)
  } catch (error) {
    console.error("Erro ao listar importações:", error)
    return NextResponse.json({ error: "Erro ao listar importações" }, { status: 500 })
  }
}

/**
 * POST – Create a new import session (optional, for future use)
 * Currently not used but kept for API consistency
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { period, year, month, bankName } = body

    // Validar dados
    if (!period || !year || !month || !bankName) {
      return NextResponse.json(
        {
          error: "Dados incompletos. Forneça period, year, month e bankName.",
        },
        { status: 400 }
      )
    }

    // Criar sessão de importação (futuramente pode ser uma tabela separada)
    // Por enquanto, apenas retornar sucesso para manter compatibilidade
    const importSession = {
      id: Date.now().toString(),
      period,
      year,
      month,
      bankName,
      status: "SETUP",
      createdAt: new Date().toISOString(),
      documents: [],
    }

    return NextResponse.json(importSession, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar importação:", error)
    return NextResponse.json({ error: "Erro ao criar importação" }, { status: 500 })
  }
}
