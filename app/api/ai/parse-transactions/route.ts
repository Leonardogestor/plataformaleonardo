import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { parseTransactionsWithAI } from "@/lib/ai-transaction-parser"

/**
 * AI-powered transaction parsing endpoint
 * Accepts raw text/data and returns structured transactions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { data, options = {} } = body

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 })
    }

    // Parse transactions with enhanced AI
    const result = await parseTransactionsWithAI(
      data,
      options.sourceType || "text",
      options.bankHint,
      options.existingCategories || [],
      options.enablePreprocessing !== false,
      true // enableQualityScoring
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("AI parsing error:", error)
    return NextResponse.json({ error: "Failed to parse transactions with AI" }, { status: 500 })
  }
}

/**
 * Health check for AI parsing service
 */
export async function GET() {
  return NextResponse.json({
    status: "AI parsing service available",
    model: "gpt-4o-mini",
    timestamp: new Date().toISOString(),
  })
}
