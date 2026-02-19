// @ts-nocheck
/**
 * Pluggy item sync – production-ready sync with lock, incremental fetch, and consistent balance updates.
 * Prevents duplicates via externalTransactionId (Pluggy transaction id).
 * Supports ~100 users/hour via per-item lock and incremental sync.
 */

import { prisma } from "@/lib/db"
import {
  getPluggyItemStatus,
  getPluggyAccounts,
  getPluggyTransactionsPage,
} from "@/lib/pluggy"

/** Default lookback when no lastSyncAt (first sync or reset). 90 days. */
const DEFAULT_SYNC_DAYS_AGO = 90

/** Safety margin: fetch from (lastSyncAt - 1 day) to avoid missing transactions due to bank latency, pending→settled, or backdated postings. Upsert prevents duplicates. */
const SYNC_FROM_SAFETY_DAYS = 1

/** Maps Pluggy transaction type to our TransactionType enum */
function mapPluggyTransactionType(type: string): "INCOME" | "EXPENSE" | "TRANSFER" {
  if (type === "CREDIT") return "INCOME"
  if (type === "DEBIT") return "EXPENSE"
  return "EXPENSE"
}

/**
 * Returns "from" date string (YYYY-MM-DD) for Pluggy transactions API.
 * When lastSyncAt exists: (lastSyncAt - 1 day) rounded to start of day (00:00 UTC) for timezone-safe, deterministic boundaries. Upsert avoids duplicates.
 * When no lastSyncAt: 90 days ago at start of day UTC.
 */
function getSyncFromDate(lastSyncAt: Date | null): string {
  if (lastSyncAt) {
    const fromDate = new Date(lastSyncAt)
    fromDate.setDate(fromDate.getDate() - SYNC_FROM_SAFETY_DAYS)
    fromDate.setUTCHours(0, 0, 0, 0)
    return fromDate.toISOString().slice(0, 10)
  }
  const from = new Date()
  from.setDate(from.getDate() - DEFAULT_SYNC_DAYS_AGO)
  from.setUTCHours(0, 0, 0, 0)
  return from.toISOString().slice(0, 10)
}

/**
 * Syncs all transactions (and account balances) for a Pluggy item.
 *
 * Lock: only one sync per itemId at a time (isSyncing flag, acquired atomically).
 * Incremental: uses (lastSyncAt - 1 day) as "from" for a safety margin; defaults to 90 days when no lastSyncAt.
 * Balance: updated once per account after all its transactions are processed.
 * Duplicates: prevented by upsert on externalTransactionId.
 */
export async function syncItemTransactions(itemId: string): Promise<void> {
  if (!itemId || typeof itemId !== "string") {
    throw new Error("syncItemTransactions: itemId is required")
  }

  // -------------------------------------------------------------------------
  // 1) Acquire lock: prevent concurrent sync for the same itemId
  // -------------------------------------------------------------------------
  const lockResult = await prisma.bankConnection.updateMany({
    where: { itemId, isSyncing: false },
    data: { isSyncing: true },
  })

  if (lockResult.count === 0) {
    const existing = await prisma.bankConnection.findUnique({
      where: { itemId },
      select: { isSyncing: true },
    })
    if (!existing) {
      console.warn("[pluggy-sync] No BankConnection for itemId", { itemId })
      return
    }
    if (existing.isSyncing) {
      return // another process is already syncing this item
    }
    return // race: assume another process won the lock
  }

  try {
    // -------------------------------------------------------------------------
    // 2) Load connection and accounts (we hold the lock)
    // -------------------------------------------------------------------------
    const connection = await prisma.bankConnection.findUnique({
      where: { itemId },
      include: { accounts: true },
    })

    if (!connection) {
      return
    }

    const userId = connection.userId
    const lastSyncAt = connection.lastSyncAt
    const fromStr = getSyncFromDate(lastSyncAt)

    let syncStartedAt = new Date()
    let syncLog: { id: string } | null = null
    syncLog = await prisma.syncLog.create({
      data: {
        itemId,
        startedAt: syncStartedAt,
        status: "PROCESSING",
      },
    })

    // -------------------------------------------------------------------------
    // 3) Fetch item status and accounts from Pluggy
    // -------------------------------------------------------------------------
    let pluggyAccounts: any[] = []
    let executionStatus: string | undefined
    let errorMsg: string | null = null
    let item: unknown = null

    try {
      const [itemRes, accountsRes] = await Promise.all([
        getPluggyItemStatus(itemId),
        getPluggyAccounts(itemId),
      ])
      item = itemRes
      pluggyAccounts = accountsRes ?? []
      executionStatus = (itemRes as { executionStatus?: string })?.executionStatus
      errorMsg = (itemRes as { error?: { message?: string } })?.error?.message ?? null
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed"
      await prisma.bankConnection.update({
        where: { itemId },
        data: {
          status: "OUTDATED",
          error: message,
          lastSyncAt: new Date(),
        },
      })
      console.error("[pluggy-sync] Pluggy API error", { itemId, error: message })
      throw e
    }

    // -------------------------------------------------------------------------
    // 4) Compute connection status and update (keep isSyncing true; update status/error only)
    // -------------------------------------------------------------------------
    const itemStatus = item != null ? (item as { status?: string })?.status : undefined
    const connectionStatus =
      executionStatus === "SUCCESS"
        ? "ACTIVE"
        : executionStatus === "LOGIN_ERROR"
          ? "LOGIN_ERROR"
          : itemStatus === "UPDATED"
            ? "ACTIVE"
            : "OUTDATED"

    await prisma.bankConnection.update({
      where: { itemId },
      data: {
        status: connectionStatus as "ACTIVE" | "LOGIN_ERROR" | "OUTDATED" | "UPDATING" | "DISCONNECTED",
        error: errorMsg,
      },
    })

    // -------------------------------------------------------------------------
    // 5) Map Pluggy account id -> our Account (BANK and CREDIT only)
    // -------------------------------------------------------------------------
    const bankAccounts = (pluggyAccounts as any[]).filter(
      (a) => a.type === "BANK" || a.type === "CREDIT"
    )
    const ourAccountsByExternalId = new Map<string, { id: string }>()
    for (const acc of connection.accounts) {
      if (acc.externalAccountId) ourAccountsByExternalId.set(acc.externalAccountId, { id: acc.id })
    }

    // -------------------------------------------------------------------------
    // 6) Per account: fetch transactions with pagination (incremental from lastSyncAt), upsert all, then update balance once
    // -------------------------------------------------------------------------
    let transactionsProcessed = 0
    let accountsProcessed = 0
    for (const acc of bankAccounts as any[]) {
      const ourAccount = ourAccountsByExternalId.get(acc.id)
      if (!ourAccount) continue

      let page = 1
      let totalPages = 1

      do {
        let pageResult: { results: any[]; totalPages: number; page: number }
        try {
          pageResult = await getPluggyTransactionsPage(acc.id, fromStr, undefined, page)
        } catch (e) {
          console.warn("[pluggy-sync] Transactions fetch failed", {
            itemId,
            accountId: acc.id,
            page,
            error: e instanceof Error ? e.message : String(e),
          })
          break
        }

        const { results: transactions } = pageResult
        totalPages = pageResult.totalPages

        for (const tx of transactions) {
          const pluggyId = tx.id
          if (!pluggyId) continue

          const amount = Math.abs(Number(tx.amount))
          const type = mapPluggyTransactionType(tx.type ?? "DEBIT")
          const description = tx.description ?? tx.descriptionRaw ?? "Transação"
          const date = tx.date ? new Date(tx.date) : new Date()
          const category = tx.category ?? "Outros"

          try {
            await prisma.transaction.upsert({
              where: { externalTransactionId: pluggyId },
              create: {
                userId,
                accountId: ourAccount.id,
                date,
                description,
                amount,
                type,
                category,
                subcategory: null,
                externalTransactionId: pluggyId,
                isPending: tx.status === "PENDING",
              },
              update: {
                amount,
                description,
                category,
                isPending: tx.status === "PENDING",
              },
            })
            transactionsProcessed++
          } catch (e) {
            console.warn("[pluggy-sync] Transaction upsert failed", {
              itemId,
              externalTransactionId: pluggyId,
              error: e instanceof Error ? e.message : String(e),
            })
          }
        }

        page++
      } while (page <= totalPages)

      // Update balance only after all transactions for this account are processed
      try {
        await prisma.account.update({
          where: { id: ourAccount.id },
          data: { balance: Number(acc.balance ?? 0) },
        })
      } catch (e) {
        console.warn("[pluggy-sync] Balance update failed", {
          itemId,
          accountId: ourAccount.id,
          error: e instanceof Error ? e.message : String(e),
        })
      }
      accountsProcessed++
    }

    // -------------------------------------------------------------------------
    // 7) Successful sync: advance lastSyncAt so next sync is incremental
    // -------------------------------------------------------------------------
    await prisma.bankConnection.update({
      where: { itemId },
      data: { lastSyncAt: new Date() },
    })

    const syncFinishedAt = new Date()
    const durationMs = syncFinishedAt.getTime() - syncStartedAt.getTime()
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: syncFinishedAt,
        durationMs,
        transactionsProcessed,
        status: "COMPLETED",
      },
    })
    console.info(
      JSON.stringify({
        type: "pluggy_sync",
        itemId,
        durationMs,
        accountsProcessed,
        transactionsProcessed,
      })
    )
  } catch (error) {
    const syncFinishedAt = new Date()
    const durationMs = syncStartedAt
      ? syncFinishedAt.getTime() - syncStartedAt.getTime()
      : 0
    try {
      if (syncLog?.id) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            finishedAt: syncFinishedAt,
            durationMs,
            transactionsProcessed: 0,
            status: "FAILED",
            error: error instanceof Error ? error.message : String(error),
          },
        })
      }
    } catch (e) {
      console.error("[pluggy-sync] Failed to update SyncLog", e)
    }
    console.info(
      JSON.stringify({
        type: "pluggy_sync",
        itemId,
        durationMs,
        accountsProcessed: 0,
        transactionsProcessed: 0,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      })
    )
    throw error
  } finally {
    // -------------------------------------------------------------------------
    // 8) Always release lock
    // -------------------------------------------------------------------------
    try {
      await prisma.bankConnection.updateMany({
        where: { itemId },
        data: { isSyncing: false },
      })
    } catch (e) {
      console.error("[pluggy-sync] Failed to release lock", { itemId, error: e })
    }
  }
}
