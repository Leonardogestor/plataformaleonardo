import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") ?? ""

    if (!category) {
      return NextResponse.json({ subcategories: [] })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        category,
        subcategory: { not: null },
      },
      select: { subcategory: true },
      distinct: ["subcategory"],
    })

    const subcategories = transactions
      .map((t) => t.subcategory)
      .filter((s): s is string => Boolean(s))
      .sort()

    return NextResponse.json({ subcategories })
  } catch (error) {
    console.error("Erro ao buscar subcategorias:", error)
    return NextResponse.json({ error: "Erro ao buscar subcategorias" }, { status: 500 })
  }
}
