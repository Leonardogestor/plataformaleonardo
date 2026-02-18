import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prompt, ...rest } = await req.json()
  const apiKey = process.env.MANUS_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured." }, { status: 500 })
  }

  try {
    const response = await fetch("https://api.manus.ai/v1/organize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt, ...rest }),
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect to Manus IA." }, { status: 500 })
  }
}
