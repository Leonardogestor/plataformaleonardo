/**
 * Internal transaction import – used by CSV/API and by PDF processing pipeline.
 * Ensures consistent upsert/creation and balance update logic.
 * PDF: deduplicação forte via externalTransactionId = "pdf:" + sha256(userId+date+amount+description).
 */

import crypto from "crypto"
import { prisma } from "@/lib/db"

// Utilitário para normalizar valores brasileiros (1.234,56 → 1234.56)
function parseBrazilianNumber(input: string | number): number {
  if (typeof input === "number") return input
  if (typeof input !== "string") return NaN
  // Remove milhar, troca vírgula por ponto
  const clean = input.replace(/\./g, "").replace(/,/g, ".")
  return Number(clean)
}

// Validação rigorosa de transação
function validateTransaction(t: any) {
  // Data válida
  const dateObj = new Date(t.date)
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    throw new Error(`Data inválida: ${t.date}`)
  }
  // Valor válido
  const amount = parseBrazilianNumber(t.amount)
  if (!isFinite(amount)) {
    throw new Error(`Valor inválido: ${t.amount}`)
  }
  return { ...t, amount, date: dateObj }
}

export interface NormalizedTransaction {
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT"
  category: string
  subcategory?: string | null
  amount: number
  description: string
  date: string // ISO date
  documentId?: string | null
  accountId?: string | null
  confidence?: number // compatível com AI parser
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
  transactions: (NormalizedTransaction & { rawText?: string })[],
  rawText?: string
): Promise<ImportTransactionsResult> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  for (const tOrig of transactions) {
    try {
      const safeCategory = tOrig.category && tOrig.category.trim() ? tOrig.category : "Outros"
      const t = validateTransaction({ ...tOrig, category: safeCategory })
      const externalId = pdfTransactionExternalId(
        userId,
        t.date.toISOString(),
        t.amount,
        t.description
      )

      await prisma.$transaction(async (tx) => {
        // Verificar se já existe para saber se é CREATE (afeta saldo) ou UPDATE (não afeta)
        const existing = await tx.transaction.findUnique({
          where: { externalTransactionId: externalId },
          select: { id: true },
        })

        await tx.transaction.upsert({
          where: { externalTransactionId: externalId },
          create: {
            userId,
            documentId: t.documentId ?? null,
            type: t.type,
            category: t.category,
            subcategory: t.subcategory ?? null,
            amount: t.amount,
            description: t.description,
            date: t.date,
            accountId: t.accountId ?? null,
            isPending: false,
            externalTransactionId: externalId,
            rawText: t.rawText || rawText || null,
          },
          update: {
            documentId: t.documentId ?? null,
            amount: t.amount,
            description: t.description,
            category: t.category,
            subcategory: t.subcategory ?? null,
            rawText: t.rawText || rawText || null,
          },
        })

        // Atualizar saldo apenas em CREATE e somente se tem conta associada
        // Reprocessamento do mesmo extrato não duplica o saldo
        if (!existing && t.accountId) {
          const increment =
            t.type === "INCOME" ? t.amount
            : t.type === "INVESTMENT" ? -t.amount
            : -Math.abs(t.amount) // EXPENSE e demais reduzem o saldo
          await tx.account.update({
            where: { id: t.accountId },
            data: { balance: { increment } },
          })
        }
      })

      results.success++
    } catch (error) {
      results.failed++
      const msg = error instanceof Error ? error.message : String(error)
      results.errors.push(`${tOrig.description}: ${msg}`)
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
  transactions: (NormalizedTransaction & { rawText?: string })[],
  options?: { accountId?: string | null; rawText?: string }
): Promise<ImportTransactionsResult> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  for (const tOrig of transactions) {
    try {
      const t = validateTransaction(tOrig)
      const accountId = t.accountId ?? options?.accountId ?? null
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            documentId: t.documentId ?? null,
            type: t.type,
            category: t.category,
            subcategory: t.subcategory ?? null,
            amount: t.amount,
            description: t.description,
            date: t.date,
            accountId,
            isPending: false,
            rawText: t.rawText || options?.rawText || null,
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
      results.errors.push(`${tOrig.description}: ${msg}`)
    }
  }

  return results
}
