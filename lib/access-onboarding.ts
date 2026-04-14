import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

const TOKEN_TTL_HOURS = 48

function getBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).replace(/\/+$/, "")
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function maskEmail(email: string): string {
  return email.replace(/(.{2}).*(@.*)/, "$1***$2")
}

async function sendAccessEmail(params: {
  email: string
  name: string
  setupUrl: string
}): Promise<{ delivered: boolean; provider: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM

  const subject = "Seu acesso à plataforma financeira"
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111">
      <h2>Olá, ${params.name || "cliente"}.</h2>
      <p>Seu pagamento foi confirmado e seu acesso já está disponível.</p>
      <p>Para criar sua senha e entrar na plataforma, use o link abaixo:</p>
      <p>
        <a href="${params.setupUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
          Definir minha senha
        </a>
      </p>
      <p>Se o botão não abrir, copie este link:</p>
      <p>${params.setupUrl}</p>
      <p>Esse link expira em ${TOKEN_TTL_HOURS} horas.</p>
    </div>
  `

  if (!resendApiKey || !emailFrom) {
    console.warn("[ACCESS] Email provider not configured. Setup link:", {
      email: maskEmail(params.email),
      setupUrl: params.setupUrl,
    })
    return { delivered: false, provider: "log_only" }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [params.email],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[ACCESS] Failed to send onboarding email", {
      email: maskEmail(params.email),
      status: response.status,
      errorText,
    })
    return { delivered: false, provider: "resend" }
  }

  return { delivered: true, provider: "resend" }
}

export async function issuePasswordSetup(params: {
  userId: string
  email: string
  name: string
}): Promise<{ setupUrl: string; delivered: boolean; provider: string }> {
  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

  await prisma.passwordSetupToken.deleteMany({
    where: {
      userId: params.userId,
      usedAt: null,
    },
  })

  await prisma.passwordSetupToken.create({
    data: {
      userId: params.userId,
      tokenHash,
      email: params.email.toLowerCase(),
      expiresAt,
    },
  })

  const setupUrl = `${getBaseUrl()}/setup-password?token=${rawToken}`
  const delivery = await sendAccessEmail({
    email: params.email,
    name: params.name,
    setupUrl,
  })

  return {
    setupUrl,
    delivered: delivery.delivered,
    provider: delivery.provider,
  }
}

export async function validatePasswordSetupToken(token: string) {
  const tokenHash = hashToken(token)
  const record = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  if (!record) return { valid: false as const, reason: "not_found" }
  if (record.usedAt) return { valid: false as const, reason: "used" }
  if (record.expiresAt < new Date()) return { valid: false as const, reason: "expired" }

  return {
    valid: true as const,
    record,
    maskedEmail: maskEmail(record.email),
  }
}

export async function consumePasswordSetupToken(token: string, password: string) {
  const validation = await validatePasswordSetupToken(token)
  if (!validation.valid) {
    return validation
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: validation.record.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordSetupToken.update({
      where: { id: validation.record.id },
      data: { usedAt: new Date() },
    }),
  ])

  return {
    valid: true as const,
    userId: validation.record.userId,
    email: validation.record.email,
  }
}
