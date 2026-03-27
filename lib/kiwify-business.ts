import { prisma } from "@/lib/db"
import { KiwifyWebhookEvent, KiwifyWebhookData } from "@/types/kiwify"
import bcrypt from "bcryptjs"

export class KiwifyBusinessLogic {
  /**
   * Process webhook event with idempotency
   */
  async processWebhookEvent(
    event: KiwifyWebhookEvent
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      // Check if event was already processed
      const existingEvent = await prisma.processedWebhookEvent.findUnique({
        where: { eventId: event.id },
      })

      if (existingEvent) {
        return {
          success: true,
          message: "Event already processed",
          userId: existingEvent.userId || undefined,
        }
      }

      // Mark event as processing
      await prisma.processedWebhookEvent.create({
        data: {
          eventId: event.id,
          eventType: event.event,
          status: "processing",
          metadata: event.data as any,
        },
      })

      // Process based on event type
      let result: { success: boolean; message: string; userId?: string }

      switch (event.event) {
        case "order_paid":
          result = await this.handleOrderPaid(event.data)
          break
        case "subscription_renewed":
          result = await this.handleSubscriptionRenewed(event.data)
          break
        case "subscription_canceled":
          result = await this.handleSubscriptionCanceled(event.data)
          break
        default:
          result = { success: false, message: `Unsupported event type: ${event.event}` }
      }

      // Update event record
      await prisma.processedWebhookEvent.update({
        where: { eventId: event.id },
        data: {
          status: result.success ? "completed" : "failed",
          errorMessage: result.success ? null : result.message,
          userId: result.userId,
          orderId: event.data.order_id,
          subscriptionId: event.data.subscription_id,
        },
      })

      return result
    } catch (error) {
      console.error("Error processing webhook event:", error)

      // Mark event as failed
      try {
        await prisma.processedWebhookEvent.update({
          where: { eventId: event.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        })
      } catch (updateError) {
        console.error("Failed to update webhook event status:", updateError)
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error processing webhook",
      }
    }
  }

  /**
   * Handle order paid event
   */
  private async handleOrderPaid(
    data: KiwifyWebhookData
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      const { customer, product, order_id, subscription_id } = data

      // Find or create user
      const user = await this.findOrCreateUser(customer)

      if (!user) {
        return { success: false, message: "Failed to create or find user" }
      }

      // Handle subscription activation
      if (product.type === "subscription" && subscription_id) {
        await this.activateSubscription(user.id, subscription_id, product)
        await this.grantPremiumAccess(user.id)
      } else if (product.type === "one_time") {
        // Handle one-time purchase (could be lifetime access or specific features)
        await this.grantPremiumAccess(user.id)
      }

      return {
        success: true,
        message: "Order processed successfully",
        userId: user.id,
      }
    } catch (error) {
      console.error("Error handling order paid:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process order",
      }
    }
  }

  /**
   * Handle subscription renewed event
   */
  private async handleSubscriptionRenewed(
    data: KiwifyWebhookData
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      const { customer, subscription_id, product } = data

      if (!subscription_id) {
        return { success: false, message: "Subscription ID missing" }
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: customer.email.toLowerCase() },
      })

      if (!user) {
        return { success: false, message: "User not found" }
      }

      // Update subscription
      await this.updateSubscription(user.id, subscription_id, product)
      await this.grantPremiumAccess(user.id)

      return {
        success: true,
        message: "Subscription renewed successfully",
        userId: user.id,
      }
    } catch (error) {
      console.error("Error handling subscription renewed:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to renew subscription",
      }
    }
  }

  /**
   * Handle subscription canceled event
   */
  private async handleSubscriptionCanceled(
    data: KiwifyWebhookData
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      const { customer, subscription_id } = data

      if (!subscription_id) {
        return { success: false, message: "Subscription ID missing" }
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: customer.email.toLowerCase() },
      })

      if (!user) {
        return { success: false, message: "User not found" }
      }

      // Cancel subscription
      await this.cancelSubscription(user.id, subscription_id)
      await this.revokePremiumAccess(user.id)

      return {
        success: true,
        message: "Subscription canceled successfully",
        userId: user.id,
      }
    } catch (error) {
      console.error("Error handling subscription canceled:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to cancel subscription",
      }
    }
  }

  /**
   * Find or create user from customer data
   */
  private async findOrCreateUser(customer: KiwifyWebhookData["customer"]) {
    try {
      // Try to find existing user
      let user = await prisma.user.findUnique({
        where: { email: customer.email.toLowerCase() },
      })

      if (user) {
        return user
      }

      // Create new user
      const tempPassword = process.env.KIWIFY_TEMP_PASSWORD || "Alterar@123"
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      user = await prisma.user.create({
        data: {
          name: customer.name.slice(0, 255),
          email: customer.email.toLowerCase(),
          password: hashedPassword,
        },
      })

      return user
    } catch (error) {
      console.error("Error finding or creating user:", error)
      return null
    }
  }

  /**
   * Activate subscription for user
   */
  private async activateSubscription(
    userId: string,
    kiwifyId: string,
    product: KiwifyWebhookData["product"]
  ) {
    const now = new Date()
    let currentPeriodEnd: Date

    // Calculate end date based on product recurring settings
    if (product.recurring) {
      const { interval, interval_count } = product.recurring
      currentPeriodEnd = new Date(now)

      if (interval === "monthly") {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval_count)
      } else if (interval === "yearly") {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + interval_count)
      }
    } else {
      // Default to 1 month if no recurring info
      currentPeriodEnd = new Date(now)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    }

    // Update or create subscription
    const existing = await prisma.subscription.findFirst({
      where: { userId },
    })

    if (existing) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          kiwifyId,
          status: "ACTIVE",
          plan: "PREMIUM",
          currentPeriodEnd,
          canceledAt: null,
        },
      })
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId,
          kiwifyId,
          status: "ACTIVE",
          plan: "PREMIUM",
          currentPeriodEnd,
        },
      })
    }
  }

  /**
   * Update existing subscription
   */
  private async updateSubscription(
    userId: string,
    kiwifyId: string,
    product: KiwifyWebhookData["product"]
  ) {
    const now = new Date()
    let currentPeriodEnd: Date

    if (product.recurring) {
      const { interval, interval_count } = product.recurring
      currentPeriodEnd = new Date(now)

      if (interval === "monthly") {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval_count)
      } else if (interval === "yearly") {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + interval_count)
      }
    } else {
      currentPeriodEnd = new Date(now)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    }

    // Find existing subscription first
    const existing = await prisma.subscription.findFirst({
      where: { userId },
    })

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          kiwifyId,
          status: "ACTIVE",
          plan: "PREMIUM",
          currentPeriodEnd,
          canceledAt: null,
        },
      })
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          kiwifyId,
          status: "ACTIVE",
          plan: "PREMIUM",
          currentPeriodEnd,
        },
      })
    }
  }

  /**
   * Cancel subscription
   */
  private async cancelSubscription(userId: string, kiwifyId: string) {
    await prisma.subscription.updateMany({
      where: {
        userId,
        kiwifyId,
      },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
      },
    })
  }

  /**
   * Grant premium access to user
   */
  private async grantPremiumAccess(userId: string) {
    const premiumFeatures = [
      "advanced_reports",
      "unlimited_transactions",
      "priority_support",
      "export_data",
      "api_access",
    ]

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
            isActive: true,
            accessExpiresAt: null, // No expiration for premium
          },
        })
      } else {
        // Create new feature
        await prisma.featureAccess.create({
          data: {
            userId,
            feature,
            isActive: true,
            source: "kiwify_premium",
          },
        })
      }
    }
  }

  /**
   * Revoke premium access from user
   */
  private async revokePremiumAccess(userId: string) {
    // Set access to expire in 30 days (grace period)
    const gracePeriodEnd = new Date()
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30)

    await prisma.featureAccess.updateMany({
      where: {
        userId,
        source: "kiwify_premium",
      },
      data: {
        isActive: false,
        accessExpiresAt: gracePeriodEnd,
      },
    })
  }
}

export const kiwifyBusinessLogic = new KiwifyBusinessLogic()
