/**
 * Internal transaction import – used by CSV/API and by PDF processing pipeline.
 * Ensures consistent upsert/creation and balance update logic.
 * PDF: deduplicação forte via externalTransactionId = "pdf:" + sha256(userId+date+amount+description).
 */

import crypto from "crypto"
import { prisma } from "@/lib/db"

export interface NormalizedTransaction {
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
  subcategory?: string
  amount: number
  description: string
  date: string // ISO date
  accountId?: string | null
}

export interface ImportTransactionsResult {
  success: number
  failed: number
  errors: string[]
}

/**
 * Gera id externo determinístico para transação de PDF (evita duplicação ao reenviar/reprocessar).
 * hash = sha256(userId + date + amount + description) → externalTransactionId = "pdf:" + hash
 */
export function pdfTransactionExternalId(
  userId: string,
  date: string,
  amount: number,
  description: string
): string {
  const normalized = [
    userId,
    date.trim(),
    String(Number(amount)),
    (description || "").trim().slice(0, 500),
  ].join("|")
  const hash = crypto.createHash("sha256").update(normalized).digest("hex")
  return `pdf:${hash}`
}

/**
 * Importa transações originadas de PDF com deduplicação forte.
 * Usa upsert por externalTransactionId (pdf:hash). Reenvio ou reprocessamento do mesmo extrato não duplica.
 */
export async function importTransactionsFromPdfWithDedup(
  userId: string,
  transactions: NormalizedTransaction[]
): Promise<ImportTransactionsResult> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  for (const t of transactions) {
    const externalId = pdfTransactionExternalId(userId, t.date, t.amount, t.description)
    try {
      await prisma.transaction.upsert({
        where: { externalTransactionId: externalId },
        create: {
          userId,
          type: t.type,
          category: t.category,
          subcategory: t.subcategory ?? null,
          amount: t.amount,
          description: t.description,
          date: new Date(t.date),
          accountId: t.accountId ?? null,
          isPending: false,
          externalTransactionId: externalId,
        },
        update: {
          amount: t.amount,
          description: t.description,
          category: t.category,
          subcategory: t.subcategory ?? null,
        },
      })
      results.success++
    } catch (error) {
      results.failed++
      const msg = error instanceof Error ? error.message : String(error)
      results.errors.push(`${t.description}: ${msg}`)
    }
  }

  return results
}

/**
 * Imports transactions for a user (server-side only; no session).
 * Used by POST /api/transactions/import (CSV/manual). No external id → create only.
 * For PDF use importTransactionsFromPdfWithDedup.
 */
export async function importTransactionsForUser(
  userId: string,
  transactions: NormalizedTransaction[],
  options?: { accountId?: string | null }
): Promise<ImportTransactionsResult> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  for (const t of transactions) {
    try {
      const accountId = t.accountId ?? options?.accountId ?? null
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            type: t.type,
            category: t.category,
            subcategory: t.subcategory ?? null,
            amount: t.amount,
            description: t.description,
            date: new Date(t.date),
            accountId,
            isPending: false,
          },
        })
        if (accountId) {
          const increment = t.type === "INCOME" ? t.amount : -t.amount
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { increment } },
          })
        }
      })
      results.success++
    } catch (error) {
      results.failed++
      const msg = error instanceof Error ? error.message : String(error)
      results.errors.push(`${t.description}: ${msg}`)
    }
  }

  return results
}
