import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const PERIOD_HOURS = 6
const DEFAULT_THRESHOLD = 10

/**
 * GET /api/cron/alert-failures
 * Counts Documents and SyncLogs with status FAILED in the last 6 hours.
 * If total > threshold, POSTs to ALERT_WEBHOOK_URL (if set) and logs a structured message.
 * Always returns 200 with summary (safe for cron; no sensitive data in response or logs).
 *
 * Security: CRON_SECRET required via Authorization: Bearer <secret> or ?secret=<secret>
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7) === secret
  const urlSecret = request.nextUrl.searchParams.get("secret")
  return urlSecret === secret
}

function isCronConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET)
}

function getThreshold(): number {
  const raw = process.env.FAIL_ALERT_THRESHOLD
  if (raw == null || raw === "") return DEFAULT_THRESHOLD
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_THRESHOLD
}

export async function GET(request: NextRequest) {
  if (!isCronConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: "CRON_SECRET not set",
      failedDocuments: 0,
      failedSyncs: 0,
      totalFailures: 0,
      periodHours: PERIOD_HOURS,
      threshold: getThreshold(),
    })
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const timestamp = new Date().toISOString()
  const since = new Date(Date.now() - PERIOD_HOURS * 60 * 60 * 1000)

  try {
    const [failedDocuments, failedSyncs] = await Promise.all([
      prisma.document.count({
        where: {
          status: "FAILED",
          updatedAt: { gte: since },
        },
      }),
      prisma.syncLog.count({
        where: {
          status: "FAILED",
          finishedAt: { gte: since, not: null },
        },
      }),
    ])

    const totalFailures = failedDocuments + failedSyncs
    const threshold = getThreshold()
    const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim()

    if (totalFailures > threshold && webhookUrl) {
      const payload = {
        type: "failure_alert",
        failedDocuments,
        failedSyncs,
        totalFailures,
        periodHours: PERIOD_HOURS,
        threshold,
        timestamp,
      }
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          console.error(
            JSON.stringify({
              type: "failure_alert_webhook",
              message: "Webhook returned non-OK status",
              statusCode: res.status,
              failedDocuments,
              failedSyncs,
              totalFailures,
              periodHours: PERIOD_HOURS,
              timestamp,
            })
          )
        }
      } catch (e) {
        console.error(
          JSON.stringify({
            type: "failure_alert_webhook",
            message: "Webhook request failed",
            failedDocuments,
            failedSyncs,
            totalFailures,
            periodHours: PERIOD_HOURS,
            timestamp,
          })
        )
      }
    }

    if (totalFailures > threshold) {
      console.error(
        JSON.stringify({
          type: "failure_alert",
          failedDocuments,
          failedSyncs,
          totalFailures,
          periodHours: PERIOD_HOURS,
          threshold,
          timestamp,
        })
      )
    }

    return NextResponse.json({
      ok: true,
      failedDocuments,
      failedSyncs,
      totalFailures,
      periodHours: PERIOD_HOURS,
      threshold,
      alertSent: totalFailures > threshold && Boolean(webhookUrl),
      timestamp,
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "alert_failures_cron_error",
        message: error instanceof Error ? error.message : String(error),
        timestamp,
      })
    )
    return NextResponse.json(
      {
        ok: false,
        error: "Count failed",
        failedDocuments: 0,
        failedSyncs: 0,
        totalFailures: 0,
        periodHours: PERIOD_HOURS,
        timestamp,
      },
      { status: 200 }
    )
  }
}
