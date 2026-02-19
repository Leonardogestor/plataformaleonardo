/**
 * Pluggy Open Finance Integration
 *
 * Cliente centralizado para comunicação com a API Pluggy.
 * Documentação: https://docs.pluggy.ai
 */

import axios, { AxiosInstance } from "axios"
import crypto from "crypto"

// Arquivo removido conforme solicitado. Open Finance será refeito do zero.
let cachedToken: string | null = null
let tokenExpiresAt: number | null = null
let axiosInstance: AxiosInstance | null = null

function getAxios(): AxiosInstance {
  if (!axiosInstance) {
    const baseURL = process.env.PLUGGY_BASE_URL || "https://api.pluggy.ai"
    axiosInstance = axios.create({ baseURL })
  }
  return axiosInstance
}

export async function getPluggyToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken ?? ""
  }
  const res = await getAxios().post("/auth", {
    clientId: process.env.PLUGGY_CLIENT_ID,
    clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  })
  cachedToken = res.data.accessToken ?? res.data.apiKey
  tokenExpiresAt = now + (res.data.expiresIn ? res.data.expiresIn * 1000 - 60000 : 9 * 60 * 1000) // 1 min safety
  if (!cachedToken) throw new Error("Pluggy token not received")
  return cachedToken
}

/** Cria connect token para o widget Pluggy (clientUserId = id do usuário na sua base) */
export async function createConnectToken(
  clientUserId: string,
  options?: { webhookUrl?: string; avoidDuplicates?: boolean }
): Promise<string> {
  const apiKey = await getPluggyToken()
  const res = await getAxios().post(
    "/connect_token",
    {
      options: {
        clientUserId,
        avoidDuplicates: options?.avoidDuplicates ?? true,
        ...(options?.webhookUrl && { webhookUrl: options.webhookUrl }),
      },
    },
    { headers: { "X-API-KEY": apiKey } }
  )
  const connectToken = res.data?.accessToken
  if (!connectToken) throw new Error("Pluggy connect token not received")
  return connectToken
}

export async function createPluggyItem(connectorId: number, parameters: any): Promise<any> {
  const token = await getPluggyToken()
  const res = await getAxios().post(
    "/items",
    { connectorId, parameters },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  return res.data
}

export async function getPluggyAccounts(itemId: string): Promise<any[]> {
  const token = await getPluggyToken()
  const res = await getAxios().get("/accounts", {
    params: { itemId },
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data.results ?? []
}

export async function getPluggyTransactions(
  accountId: string,
  from?: string,
  to?: string
): Promise<any[]> {
  const token = await getPluggyToken()
  const params: Record<string, string | number> = { accountId, pageSize: 500 }
  if (from) params.from = from
  if (to) params.to = to
  const res = await getAxios().get("/transactions", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  })
  return res.data.results ?? []
}

/**
 * Fetches one page of transactions from Pluggy API.
 * Used by sync logic to support pagination (Pluggy may return totalPages > 1).
 */
export async function getPluggyTransactionsPage(
  accountId: string,
  from?: string,
  to?: string,
  page: number = 1
): Promise<{ results: any[]; totalPages: number; page: number }> {
  const token = await getPluggyToken()
  const params: Record<string, string | number> = { accountId, pageSize: 500, page }
  if (from) params.from = from
  if (to) params.to = to
  const res = await getAxios().get("/transactions", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  })
  const results = res.data.results ?? []
  const totalPages = res.data.totalPages ?? 1
  const currentPage = res.data.page ?? page
  return { results, totalPages, page: currentPage }
}

export async function getPluggyItemStatus(itemId: string): Promise<any> {
  const token = await getPluggyToken()
  const res = await getAxios().get(`/items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export async function listPluggyConnectors(): Promise<any[]> {
  const token = await getPluggyToken()
  const res = await getAxios().get("/connectors", {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data.results
}

export function validatePluggyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
