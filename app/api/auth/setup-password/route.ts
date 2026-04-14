import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  consumePasswordSetupToken,
  validatePasswordSetupToken,
} from "@/lib/access-onboarding"

const setupPasswordSchema = z
  .object({
    token: z.string().min(1, "Token invalido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").max(100),
    confirmPassword: z.string().min(6, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"],
  })

function getStatusForReason(reason: string): number {
  if (reason === "expired" || reason === "used") {
    return 410
  }

  return 400
}

function getMessageForReason(reason: string): string {
  if (reason === "expired") return "Esse link expirou. Solicite um novo acesso."
  if (reason === "used") return "Esse link ja foi utilizado."
  return "Link de acesso invalido."
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ valid: false, error: "Token obrigatorio" }, { status: 400 })
  }

  const validation = await validatePasswordSetupToken(token)
  if (!validation.valid) {
    return NextResponse.json(
      {
        valid: false,
        error: getMessageForReason(validation.reason),
        reason: validation.reason,
      },
      { status: getStatusForReason(validation.reason) }
    )
  }

  return NextResponse.json({
    valid: true,
    email: validation.maskedEmail,
    name: validation.record.user.name,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = setupPasswordSchema.parse(body)

    const result = await consumePasswordSetupToken(token, password)
    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: getMessageForReason(result.reason),
          reason: result.reason,
        },
        { status: getStatusForReason(result.reason) }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Senha definida com sucesso. Agora voce ja pode fazer login.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message }, { status: 400 })
    }

    console.error("[SETUP PASSWORD] Failed to set password", error)
    return NextResponse.json(
      { success: false, error: "Nao foi possivel definir a senha agora." },
      { status: 500 }
    )
  }
}
