import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

/**
 * Webhook Kiwify: compra aprovada → cria conta na plataforma para o cliente.
 * Configure na Kiwify: Apps > Webhooks > Criar > Evento "Compra aprovada" > URL: https://seu-dominio.com/api/webhooks/kiwify
 * Opcional: defina KIWIFY_WEBHOOK_SECRET no .env e envie no header X-Kiwify-Secret para validar.
 */
const TEMP_PASSWORD_ENV = "KIWIFY_TEMP_PASSWORD"
const DEFAULT_TEMP_PASSWORD = "Alterar@123"

function extractEmail(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  const cust = o.customer && typeof o.customer === "object" ? (o.customer as Record<string, unknown>) : null
  const email =
    (o.email as string) ??
    (o.customer_email as string) ??
    (cust?.email as string)
  return typeof email === "string" && email.includes("@") ? email.trim() : null
}

function extractName(body: unknown): string {
  if (!body || typeof body !== "object") return "Cliente"
  const o = body as Record<string, unknown>
  const cust = o.customer && typeof o.customer === "object" ? (o.customer as Record<string, unknown>) : null
  const name =
    (o.name as string) ??
    (o.customer_name as string) ??
    (cust?.name as string)
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 255) : "Cliente"
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.KIWIFY_WEBHOOK_SECRET
    if (secret) {
      const received = request.headers.get("x-kiwify-secret") ?? request.nextUrl.searchParams.get("secret")
      if (received !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await request.json().catch(() => null)
    const email = extractEmail(body)
    if (!email) {
      return NextResponse.json(
        { error: "Payload sem email do cliente", received: !!body },
        { status: 400 }
      )
    }

    const name = extractName(body)
    const tempPassword = process.env[TEMP_PASSWORD_ENV] ?? DEFAULT_TEMP_PASSWORD
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "Usuário já existe",
        email: existing.email,
      })
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      ok: true,
      message: "Conta criada com sucesso",
      email: user.email,
      userId: user.id,
    })
  } catch (error) {
    console.error("[webhook kiwify]", error)
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    )
  }
}
