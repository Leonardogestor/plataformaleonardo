import axios, { AxiosInstance } from "axios"
import crypto from "crypto"
import {
  KiwifyWebhookEvent,
  KiwifyWebhookValidation,
  KiwifyCustomer,
  KiwifySubscription,
  KiwifyOrder,
} from "@/types/kiwify"

export class KiwifyClient {
  private client: AxiosInstance
  private clientId: string
  private clientSecret: string
  private webhookSecret: string

  constructor() {
    this.clientId = process.env.KIWIFY_CLIENT_ID!
    this.clientSecret = process.env.KIWIFY_CLIENT_SECRET!
    this.webhookSecret = process.env.KIWIFY_WEBHOOK_SECRET!

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Kiwify credentials not found in environment variables")
    }

    this.client = axios.create({
      baseURL: "https://api.kiwify.com.br/v1",
      auth: {
        username: this.clientId,
        password: this.clientSecret,
      },
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LMG-Platform/1.0",
      },
      timeout: 30000,
    })
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string
  ): KiwifyWebhookValidation {
    try {
      if (!this.webhookSecret) {
        return {
          isValid: false,
          error: "Webhook secret not configured",
        }
      }

      // Kiwify uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest("hex")

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      )

      return {
        isValid,
        error: isValid ? undefined : "Invalid signature",
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown validation error",
      }
    }
  }

  /**
   * Parse and validate webhook event
   */
  parseWebhookEvent(
    payload: unknown,
    signature?: string,
    timestamp?: string
  ): { event?: KiwifyWebhookEvent; error?: string } {
    try {
      if (!payload || typeof payload !== "object") {
        return { error: "Invalid payload format" }
      }

      const event = payload as KiwifyWebhookEvent

      // Validate required fields
      if (!event.event || !event.data || !event.id) {
        return { error: "Missing required fields in webhook event" }
      }

      // Validate event type
      const validEvents = ["order_paid", "subscription_renewed", "subscription_canceled"]
      if (!validEvents.includes(event.event)) {
        return { error: `Unsupported event type: ${event.event}` }
      }

      // Validate signature if provided
      if (signature && timestamp) {
        const validation = this.validateWebhookSignature(
          JSON.stringify(payload),
          signature,
          timestamp
        )

        if (!validation.isValid) {
          return { error: validation.error }
        }
      }

      return { event }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to parse webhook event",
      }
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<KiwifyCustomer | null> {
    try {
      const response = await this.client.get<KiwifyCustomer>(`/customers/${customerId}`)
      return response.data
    } catch (error) {
      console.error("Failed to fetch Kiwify customer:", error)
      return null
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<KiwifySubscription | null> {
    try {
      const response = await this.client.get<KiwifySubscription>(`/subscriptions/${subscriptionId}`)
      return response.data
    } catch (error) {
      console.error("Failed to fetch Kiwify subscription:", error)
      return null
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<KiwifyOrder | null> {
    try {
      const response = await this.client.get<KiwifyOrder>(`/orders/${orderId}`)
      return response.data
    } catch (error) {
      console.error("Failed to fetch Kiwify order:", error)
      return null
    }
  }

  /**
   * Find customer by email
   */
  async findCustomerByEmail(email: string): Promise<KiwifyCustomer | null> {
    try {
      const response = await this.client.get<{ data: KiwifyCustomer[] }>("/customers", {
        params: { email },
      })

      if (response.data.data.length > 0) {
        return response.data.data[0] || null
      }

      return null
    } catch (error) {
      console.error("Failed to search Kiwify customer by email:", error)
      return null
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.client.post(`/subscriptions/${subscriptionId}/cancel`)
      return true
    } catch (error) {
      console.error("Failed to cancel Kiwify subscription:", error)
      return false
    }
  }

  /**
   * Health check for Kiwify API
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/health")
      return true
    } catch (error) {
      console.error("Kiwify API health check failed:", error)
      return false
    }
  }
}

// Singleton instance
export const kiwifyClient = new KiwifyClient()
