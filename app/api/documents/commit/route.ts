/**
 * POST /api/documents/commit
 * Estágio 3 do Zero-Fault Ingestion: lança transações revisadas de forma atômica.
 * Garante deduplicação forense, rollback total em caso de erro e invalidação do cache.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { pdfTransactionExternalId } from "@/lib/transaction-import"
import { z } from "zod"

const transactionSchema = z.object({
  tempId: z.string(),
  date: z.string().min(1, "Data é obrigatória"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "INVESTMENT"]),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
})

const commitBodySchema = z.object({
  transactions: z.array(transactionSchema).min(1, "Nenhuma transação para lançar"),
  accountId: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const userId = session.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const parsed = commitBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { transactions, accountId } = parsed.data

  // --- Pré-validação: nenhum valor zero ou categoria vazia ---
  const invalid = transactions.filter((t) => t.amount <= 0 || !t.category.trim())
  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: `${invalid.length} transação(ões) com valor zero ou categoria vazia. Corrija antes de lançar.`,
        invalid: invalid.map((t) => t.tempId),
      },
      { status: 422 }
    )
  }

  // --- Deduplicação forense: calcula hashes e verifica existentes ---
  const externalIds = transactions.map((t) => {
    const isoDate = new Date(t.date).toISOString()
    return pdfTransactionExternalId(userId, isoDate, t.amount, t.description)
  })

  const existingTxs = await prisma.transaction.findMany({
    where: { externalTransactionId: { in: externalIds } },
    select: { externalTransactionId: true },
  })
  const existingSet = new Set(existingTxs.map((t) => t.externalTransactionId))

  const seenInBatch = new Set<string>()
  const toCreate = transactions.filter((_, idx) => {
    const id = externalIds[idx] ?? ""
    if (existingSet.has(id) || seenInBatch.has(id)) return false
    seenInBatch.add(id)
    return true
  })
  const duplicateCount = transactions.length - toCreate.length

  if (toCreate.length === 0) {
    return NextResponse.json({
      committed: 0,
      duplicates: duplicateCount,
      message: `Todas as ${duplicateCount} transação(ões) já foram lançadas anteriormente.`,
    })
  }

  // --- Lançamento atômico via prisma.$transaction ---
  let committed = 0
  try {
    await prisma.$transaction(async (tx) => {
      let balanceDelta = 0

      for (let i = 0; i < toCreate.length; i++) {
        const t = toCreate[i]!
        const externalId = pdfTransactionExternalId(
          userId,
          new Date(t.date).toISOString(),
          t.amount,
          t.description
        )

        await tx.transaction.create({
          data: {
            userId,
            date: new Date(t.date),
            amount: t.amount,
            type: t.type,
            category: t.category.trim(),
            description: t.description,
            accountId: accountId ?? null,
            isPending: false,
            externalTransactionId: externalId,
          },
        })

        // Acumula delta de saldo somente se há conta vinculada
        if (accountId) {
          if (t.type === "INCOME") balanceDelta += t.amount
          else if (t.type === "INVESTMENT") balanceDelta -= t.amount
          else balanceDelta -= Math.abs(t.amount) // EXPENSE e TRANSFER
        }

        committed++
      }

      // Atualiza saldo da conta em uma única operação
      if (accountId && balanceDelta !== 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: balanceDelta } },
        })
      }

      // Invalida snapshots consolidados para forçar recálculo do dashboard
      await tx.financialSummary.deleteMany({ where: { userId } })
    })
  } catch (err) {
    console.error("Commit atomic error:", err)
    return NextResponse.json(
      { error: "Falha ao lançar transações. Nenhuma alteração foi salva." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    committed,
    duplicates: duplicateCount,
    message:
      duplicateCount > 0
        ? `${committed} transação(ões) lançada(s). ${duplicateCount} duplicada(s) ignorada(s).`
        : `${committed} transação(ões) lançada(s) com sucesso.`,
  })
}
