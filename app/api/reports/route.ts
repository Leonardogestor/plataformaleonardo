import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateMonthlyReport, generateAnnualReport } from "@/lib/reports"
import { z } from "zod"

const monthlyReportSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
})

const annualReportSchema = z.object({
  year: z.number().min(2000).max(2100),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "monthly"

    if (type === "monthly") {
      const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
      const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

      const validated = monthlyReportSchema.parse({ month, year })
      const report = await generateMonthlyReport(session.user.id, validated.month, validated.year)

      return NextResponse.json(report)
    } else if (type === "annual") {
      const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

      const validated = annualReportSchema.parse({ year })
      const report = await generateAnnualReport(session.user.id, validated.year)

      return NextResponse.json(report)
    } else {
      return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Erro ao gerar relatório:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic"
