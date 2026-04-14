import { DocumentStatus } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { issuePasswordSetup } from "@/lib/access-onboarding"

interface KiwifyWebhookEvent {
  event: "order_paid" | "subscription_renewed" | "subscription_canceled"
  data: {
    order_id?: string
    transaction_id?: string
    subscription_id?: string
    status: string
    amount: number
    currency: string
    customer: {
      name: string
      email: string
      document?: string
      phone?: string
    }
    product: {
      id: string
      name: string
      type: "subscription" | "one_time"
      recurring?: {
        interval: "monthly" | "yearly"
        interval_count: number
      }
    }
    paid_at?: string
  }
  id: string
  created_at: string
}

// Production-safe logging (no sensitive data)
const logSafe = {
  info: (message: string, context?: Record<string, any>) => {
    const safeContext = context
      ? Object.fromEntries(
          Object.entries(context).map(([key, value]) => [
            key,
            typeof value === "string" && value.includes("@")
              ? value.replace(/(.{2}).*(@.*)/, "$1***$2")
              : value,
          ])
        )
      : {}
    console.log(`[KIWIFY] ${message}`, safeContext)
  },
  error: (message: string, error?: any) => {
    console.error(`[KIWIFY ERROR] ${message}`, error?.message || error)
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[KIWIFY WARN] ${message}`, context)
  },
}

function extractEmail(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  const cust =
    o.customer && typeof o.customer === "object" ? (o.customer as Record<string, unknown>) : null
  const email = (o.email as string) ?? (o.customer_email as string) ?? (cust?.email as string)
  return typeof email === "string" && email.includes("@") ? email.trim() : null
}

function extractName(body: unknown): string {
  if (!body || typeof body !== "object") return "Cliente"
  const o = body as Record<string, unknown>
  const cust =
    o.customer && typeof o.customer === "object" ? (o.customer as Record<string, unknown>) : null
  const name = (o.name as string) ?? (o.customer_name as string) ?? (cust?.name as string)
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 255) : "Cliente"
}

function extractEventId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  return (o.id as string) || (o.transaction_id as string) || null
}

function extractEventType(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  return (o.event as string) || null
}

async function validateWebhook(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET
  if (!secret) {
    logSafe.warn("Webhook secret not configured, skipping validation")
    return { valid: true }
  }

  const received =
    request.headers.get("x-kiwify-secret") ?? request.nextUrl.searchParams.get("secret")
  if (!received) {
    return { valid: false, error: "Missing webhook secret" }
  }

  if (received !== secret) {
    return { valid: false, error: "Invalid webhook secret" }
  }

  return { valid: true }
}

// PROPER IDEMPOTENCY - using dedicated table
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const existing = await prisma.processedWebhookEvent.findUnique({
      where: { eventId },
      select: { id: true, status: true },
    })

    return existing?.status === DocumentStatus.COMPLETED
  } catch (error) {
    logSafe.error("Failed to check event processing status", error)
    // Fail safe - assume not processed to avoid missing events
    return false
  }
}

async function markEventProcessed(
  eventId: string,
  eventType: string,
  userId: string | null,
  orderId: string | null,
  subscriptionId: string | null,
  metadata: any
): Promise<void> {
  try {
    // Check if event already exists
    const existing = await prisma.processedWebhookEvent.findUnique({
      where: { eventId },
    })

    if (existing) {
      // Update existing event
      await prisma.processedWebhookEvent.update({
        where: { id: existing.id },
        data: {
          status: DocumentStatus.COMPLETED,
          userId,
          orderId,
          subscriptionId,
          metadata: metadata as Prisma.JsonObject,
          processedAt: new Date(),
        },
      })
    } else {
      // Create new event
      await prisma.processedWebhookEvent.create({
        data: {
          eventId,
          eventType,
          status: DocumentStatus.COMPLETED,
          userId,
          orderId,
          subscriptionId,
          metadata: metadata as Prisma.JsonObject,
        },
      })
    }
  } catch (error) {
    logSafe.error("Failed to mark event as processed", error)
    // Don't throw - webhook should still succeed
  }
}

async function markEventFailed(
  eventId: string,
  eventType: string,
  errorMessage: string
): Promise<void> {
  try {
    // Check if event already exists
    const existing = await prisma.processedWebhookEvent.findUnique({
      where: { eventId },
    })

    if (existing) {
      // Update existing event
      await prisma.processedWebhookEvent.update({
        where: { id: existing.id },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage,
        },
      })
    } else {
      // Create new event
      await prisma.processedWebhookEvent.create({
        data: {
          eventId,
          eventType,
          status: DocumentStatus.FAILED,
          errorMessage,
        },
      })
    }
  } catch (error) {
    logSafe.error("Failed to mark event as failed", error)
  }
}

// ATOMIC USER OPERATIONS
async function findOrCreateUser(
  email: string,
  name: string
): Promise<{ user: any; created: boolean }> {
  const normalizedEmail = email.toLowerCase().trim()

  try {
    // First try to find existing user
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    })

    if (existing) {
      logSafe.info("User found", { email: normalizedEmail, userId: existing.id })
      return { user: existing, created: false }
    }

    // New Kiwify users receive a secure setup link instead of sharing a fixed password.
    const randomPassword = crypto.randomBytes(32).toString("hex")
    const hashedPassword = await bcrypt.hash(randomPassword, 10)

    const newUser = await prisma.user.create({
      data: {
        name: name.trim().slice(0, 255),
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: { id: true, email: true, name: true },
    })

    logSafe.info("User created", { email: normalizedEmail, userId: newUser.id })
    return { user: newUser, created: true }
  } catch (error) {
    // Handle potential race conditions
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Unique constraint violation - user was created by another request
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, name: true },
      })

      if (existing) {
        logSafe.info("User found after race condition", {
          email: normalizedEmail,
          userId: existing.id,
        })
        return { user: existing, created: false }
      }
    }

    throw error
  }
}

// PROPER SUBSCRIPTION MANAGEMENT
async function createOrUpdateSubscription(
  userId: string,
  kiwifyId: string | null,
  plan: "PREMIUM" | "PRO",
  status: "ACTIVE" | "CANCELED" | "EXPIRED",
  currentPeriodEnd?: Date
): Promise<void> {
  try {
    // First, find existing subscription
    const existing = await prisma.subscription.findFirst({
      where: { userId },
    })

    if (existing) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          kiwifyId,
          plan,
          status,
          currentPeriodEnd,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId,
          kiwifyId,
          plan,
          status,
          currentPeriodEnd,
        },
      })
    }

    logSafe.info("Subscription updated", { userId, plan, status })
  } catch (error) {
    logSafe.error("Failed to update subscription", error)
    throw error
  }
}

// FEATURE ACCESS MANAGEMENT
async function updateFeatureAccess(
  userId: string,
  isActive: boolean,
  accessExpiresAt?: Date
): Promise<void> {
  const premiumFeatures = [
    "advanced_reports",
    "unlimited_transactions",
    "priority_support",
    "export_data",
    "api_access",
  ]

  try {
    // Update all premium features atomically
    await prisma.featureAccess.updateMany({
      where: {
        userId,
        feature: { in: premiumFeatures },
      },
      data: {
        isActive,
        accessExpiresAt,
        updatedAt: new Date(),
      },
    })

    // Ensure all features exist
    for (const feature of premiumFeatures) {
      const existing = await prisma.featureAccess.findFirst({
        where: {
          userId,
          feature,
        },
      })

      if (existing) {
        // Update existing feature
        await prisma.featureAccess.update({
          where: { id: existing.id },
          data: {
            isActive,
            accessExpiresAt,
            updatedAt: new Date(),
          },
        })
      } else {
        // Create new feature
        await prisma.featureAccess.create({
          data: {
            userId,
            feature,
            isActive,
            accessExpiresAt,
            source: "kiwify_premium",
          },
        })
      }
    }

    logSafe.info("Feature access updated", {
      userId,
      isActive,
      featureCount: premiumFeatures.length,
    })
  } catch (error) {
    logSafe.error("Failed to update feature access", error)
    throw error
  }
}

// BUSINESS LOGIC WITH TRANSACTIONS
async function processOrderPaid(
  data: any
): Promise<{
  success: boolean
  message: string
  userId?: string
  accessIssued?: boolean
  accessEmailSent?: boolean
}> {
  const { customer, product, subscription_id, order_id } = data

  if (!customer?.email) {
    return { success: false, message: "Missing customer email" }
  }

  let userId: string | undefined
  let userWasCreated = false

  try {
    // ATOMIC TRANSACTION
    await prisma.$transaction(async (tx) => {
      // Find or create user
      const { user, created } = await findOrCreateUser(customer.email, customer.name)
      userId = user.id
      userWasCreated = created

      // Calculate subscription period
      let currentPeriodEnd: Date | undefined
      if (product.type === "subscription" && product.recurring) {
        const now = new Date()
        currentPeriodEnd = new Date(now)

        if (product.recurring.interval === "monthly") {
          currentPeriodEnd.setMonth(
            currentPeriodEnd.getMonth() + (product.recurring.interval_count || 1)
          )
        } else if (product.recurring.interval === "yearly") {
          currentPeriodEnd.setFullYear(
            currentPeriodEnd.getFullYear() + (product.recurring.interval_count || 1)
          )
        }
      }

      // Create/update subscription
      await createOrUpdateSubscription(
        user.id,
        subscription_id || null,
        "PREMIUM",
        "ACTIVE",
        currentPeriodEnd
      )

      // Activate features
      await updateFeatureAccess(user.id, true, undefined) // No expiration for active premium

      return { userId: user.id }
    })

    let accessEmailSent: boolean | undefined
    if (userWasCreated && userId) {
      try {
        const accessDelivery = await issuePasswordSetup({
          userId,
          email: customer.email,
          name: customer.name || "Cliente",
        })
        accessEmailSent = accessDelivery.delivered
        logSafe.info("Access setup issued after order payment", {
          userId,
          delivered: accessDelivery.delivered,
          provider: accessDelivery.provider,
        })
      } catch (accessError) {
        logSafe.error("Failed to issue password setup after order payment", accessError)
      }
    }

    logSafe.info("Order paid processed successfully", {
      userId,
      orderId: order_id,
      subscriptionId: subscription_id || null,
      plan: "PREMIUM",
    })

    return {
      success: true,
      message: "Order processed successfully",
      userId,
      accessIssued: userWasCreated,
      accessEmailSent,
    }
  } catch (error) {
    logSafe.error("Failed to process order paid", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process order",
    }
  }
}

async function processSubscriptionRenewed(
  data: any
): Promise<{
  success: boolean
  message: string
  userId?: string
  accessIssued?: boolean
  accessEmailSent?: boolean
}> {
  const { customer, subscription_id } = data

  if (!customer?.email) {
    return { success: false, message: "Missing customer email" }
  }

  let userId: string | undefined
  let userWasCreated = false

  try {
    await prisma.$transaction(async (tx) => {
      // Find existing user
      const { user, created } = await findOrCreateUser(customer.email, customer.name)
      userId = user.id
      userWasCreated = created

      // Calculate new period end
      const now = new Date()
      const currentPeriodEnd = new Date(now)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // Default monthly

      // Update subscription
      await createOrUpdateSubscription(
        user.id,
        subscription_id || null,
        "PREMIUM",
        "ACTIVE",
        currentPeriodEnd
      )

      // Ensure features remain active
      await updateFeatureAccess(user.id, true, undefined)

      return { userId: user.id }
    })

    let accessEmailSent: boolean | undefined
    if (userWasCreated && userId) {
      try {
        const accessDelivery = await issuePasswordSetup({
          userId,
          email: customer.email,
          name: customer.name || "Cliente",
        })
        accessEmailSent = accessDelivery.delivered
        logSafe.info("Access setup issued after subscription renewal", {
          userId,
          delivered: accessDelivery.delivered,
          provider: accessDelivery.provider,
        })
      } catch (accessError) {
        logSafe.error("Failed to issue password setup after subscription renewal", accessError)
      }
    }

    logSafe.info("Subscription renewed successfully", {
      userId,
      subscriptionId: subscription_id,
    })

    return {
      success: true,
      message: "Subscription renewed successfully",
      userId,
      accessIssued: userWasCreated,
      accessEmailSent,
    }
  } catch (error) {
    logSafe.error("Failed to process subscription renewal", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to renew subscription",
    }
  }
}

async function processSubscriptionCanceled(
  data: any
): Promise<{ success: boolean; message: string; userId?: string }> {
  const { customer, subscription_id } = data

  if (!customer?.email) {
    return { success: false, message: "Missing customer email" }
  }

  let userId: string | undefined

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find existing user
      const existing = await tx.user.findUnique({
        where: { email: customer.email.toLowerCase() },
        select: { id: true },
      })

      if (!existing) {
        throw new Error("User not found")
      }

      userId = existing.id

      // Update subscription status
      await createOrUpdateSubscription(existing.id, subscription_id || null, "PREMIUM", "CANCELED")

      // Set grace period (30 days)
      const gracePeriodEnd = new Date()
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30)

      // Deactivate features with grace period
      await updateFeatureAccess(existing.id, false, gracePeriodEnd)

      return { userId: existing.id }
    })

    logSafe.info("Subscription canceled successfully", {
      userId,
      subscriptionId: subscription_id,
      gracePeriodDays: 30,
    })

    return {
      success: true,
      message: "Subscription canceled successfully",
      userId,
    }
  } catch (error) {
    logSafe.error("Failed to process subscription cancellation", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to cancel subscription",
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let eventId: string | null = null
  let eventType: string | null = null

  try {
    logSafe.info("Webhook received", { timestamp: new Date().toISOString() })

    // Validate webhook
    const validation = await validateWebhook(request)
    if (!validation.valid) {
      logSafe.warn("Webhook validation failed", { error: validation.error })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json().catch(() => null)
    if (!body) {
      logSafe.warn("Invalid JSON received")
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    // Extract required information
    const email = extractEmail(body)
    if (!email) {
      logSafe.warn("Missing customer email in payload")
      return NextResponse.json({ error: "Missing customer email" }, { status: 400 })
    }

    eventId = extractEventId(body)
    eventType = extractEventType(body)

    logSafe.info("Processing webhook", {
      eventId: eventId || "unknown",
      eventType: eventType || "unknown",
      customerEmail: email,
    })

    // Check idempotency
    if (eventId && (await isEventProcessed(eventId))) {
      logSafe.info("Event already processed", { eventId })
      return NextResponse.json({
        success: true,
        message: "Event already processed",
        eventId,
      })
    }

    // Process based on event type
    let result: {
      success: boolean
      message: string
      userId?: string
      accessIssued?: boolean
      accessEmailSent?: boolean
    }

    switch (eventType) {
      case "order_paid":
        result = await processOrderPaid(body.data || body)
        break
      case "subscription_renewed":
        result = await processSubscriptionRenewed(body.data || body)
        break
      case "subscription_canceled":
        result = await processSubscriptionCanceled(body.data || body)
        break
      default:
        logSafe.warn("Unknown event type", { eventType })
        // Legacy handling - create user account only
        const name = extractName(body)
        const { user, created } = await findOrCreateUser(email, name)

        let accessEmailSent: boolean | undefined
        if (created) {
          try {
            const accessDelivery = await issuePasswordSetup({
              userId: user.id,
              email,
              name,
            })
            accessEmailSent = accessDelivery.delivered
          } catch (accessError) {
            logSafe.error("Failed to issue password setup for legacy event", accessError)
          }
        }

        result = {
          success: true,
          message: "Account processed (legacy)",
          userId: user.id,
          accessIssued: created,
          accessEmailSent,
        }
        break
    }

    // Mark event as processed or failed
    if (eventId) {
      if (result.success) {
        await markEventProcessed(
          eventId,
          eventType || "unknown",
          result.userId || null,
          body.data?.order_id || null,
          body.data?.subscription_id || null,
          { email, success: true }
        )
      } else {
        await markEventFailed(eventId, eventType || "unknown", result.message)
      }
    }

    const processingTime = Date.now() - startTime
    logSafe.info("Webhook processed", {
      success: result.success,
      eventId,
      eventType,
      processingTime: `${processingTime}ms`,
    })

    // Always return 200 quickly
    return NextResponse.json({
      success: result.success,
      message: result.message,
      userId: result.userId,
      eventId,
      eventType,
      processingTime,
    })
  } catch (error) {
    const processingTime = Date.now() - startTime

    logSafe.error("Critical webhook error", error)

    // Mark event as failed if we have an ID
    if (eventId && eventType) {
      await markEventFailed(
        eventId,
        eventType,
        error instanceof Error ? error.message : "Unknown critical error"
      )
    }

    // Always return 200 to avoid webhook retries
    return NextResponse.json({
      success: false,
      message: "Webhook processed with errors",
      eventId,
      eventType,
      processingTime,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
