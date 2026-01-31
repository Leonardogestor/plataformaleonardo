import { NextResponse } from "next/server"

export async function GET() {
  try {
    const clientId = process.env.PLUGGY_CLIENT_ID
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Credenciais não configuradas" }, { status: 500 })
    }

    // Retorna um token simples para o cliente
    return NextResponse.json({
      token: "mock-token",
      clientId,
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao obter token" }, { status: 500 })
  }
}
