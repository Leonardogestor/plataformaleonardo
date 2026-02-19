import { NextRequest, NextResponse } from "next/server"
import { validatePluggyWebhookSignature } from "@/lib/pluggy"
import { syncItemTransactions } from "@/lib/pluggy-sync"

/**
 * Pluggy webhook endpoint.
 * Receives POST with JSON body and x-pluggy-signature (HMAC SHA256).
 * Validates signature, then handles supported event types (e.g. item/updated).
 * Returns 2XX quickly so Pluggy does not retry; processing runs after response.
 */

export async function POST(request: NextRequest) {
  // 1. Read raw body first – required for signature verification and must not be consumed twice
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (e) {
    console.error("[open-finance/webhook] Failed to read body:", e)
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // 2. Get signature header (Pluggy sends x-pluggy-signature)
  const signature = request.headers.get("x-pluggy-signature") ?? request.headers.get("X-Pluggy-Signature") ?? ""

  const secret = process.env.PLUGGY_WEBHOOK_SECRET
  if (!secret || secret.length === 0) {
    console.error("[open-finance/webhook] PLUGGY_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  // 3. Validate HMAC SHA256 signature; reject if invalid (prevents forgery)
  const isValid = validatePluggyWebhookSignature(rawBody, signature, secret)
  if (!isValid) {
    console.warn("[open-finance/webhook] Invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // 4. Parse JSON safely
  let payload: { event?: string; itemId?: string; data?: { id?: string; itemId?: string } }
  try {
    payload = JSON.parse(rawBody) as typeof payload
  } catch {
    console.warn("[open-finance/webhook] Invalid JSON")
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // 5. Handle only the event type we care about; ignore others without failing
  const event = payload?.event
  if (event !== "item/updated") {
    // Acknowledge other events so Pluggy does not retry; we simply do nothing
    return NextResponse.json({ ok: true })
  }

  // 6. Extract itemId – Pluggy item/updated sends itemId at top level (see docs)
  const itemId =
    payload.itemId ??
    payload.data?.id ??
    payload.data?.itemId ??
    ""

  if (!itemId || typeof itemId !== "string") {
    console.warn("[open-finance/webhook] item/updated missing itemId")
    return NextResponse.json({ ok: true })
  }

  // 7. Run sync in background so we return 2XX within 5s (Pluggy requirement)
  void (async () => {
    try {
      await syncItemTransactions(itemId)
    } catch (e) {
      console.error("[open-finance/webhook] syncItemTransactions failed:", e)
    }
  })()

  return NextResponse.json({ ok: true })
}
