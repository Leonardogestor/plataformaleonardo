import { NextResponse } from "next/server"

export async function POST(_req: Request) {
  const res = await fetch(`${process.env.PLUGGY_BASE_URL}/connect_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": process.env.PLUGGY_CLIENT_ID!,
      "X-Client-Secret": process.env.PLUGGY_CLIENT_SECRET!,
    },
    body: JSON.stringify({
      clientUserId: "user@lmg.com",
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    return NextResponse.json({ error }, { status: 500 })
  }

  const data = await res.json()

  return NextResponse.json({
    connectToken: data.connectToken,
  })
}
