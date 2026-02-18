import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { GOVERNANCE_ITEMS_DEFAULT } from "@/lib/governance-checklist-defaults"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10)
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: "Ano inválido" }, { status: 400 })
    }

    const existing = await prisma.governanceChecklistItem.findMany({
      where: { userId: session.user.id, year },
      orderBy: { itemKey: "asc" },
    })

    const byKey = new Map(existing.map((e) => [e.itemKey, e]))
    const items = GOVERNANCE_ITEMS_DEFAULT.map((def) => {
      const item = byKey.get(def.key)
      return {
        id: item?.id,
        itemKey: def.key,
        itemLabel: def.label,
        completedAt: item?.completedAt ?? null,
        documentId: item?.documentId ?? null,
      }
    })

    return NextResponse.json({ year, items })
  } catch (error) {
    console.error("Erro ao buscar checklist:", error)
    return NextResponse.json({ error: "Erro ao buscar checklist" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { year, itemKey, completed, documentId } = body as {
      year: number
      itemKey: string
      completed?: boolean
      documentId?: string | null
    }

    if (!Number.isFinite(year) || !itemKey) {
      return NextResponse.json({ error: "year e itemKey são obrigatórios" }, { status: 400 })
    }

    const def = GOVERNANCE_ITEMS_DEFAULT.find((d) => d.key === itemKey)
    if (!def) {
      return NextResponse.json({ error: "Item inválido" }, { status: 400 })
    }

    const item = await prisma.governanceChecklistItem.upsert({
      where: {
        userId_year_itemKey: {
          userId: session.user.id,
          year,
          itemKey,
        },
      },
      create: {
        userId: session.user.id,
        year,
        itemKey,
        itemLabel: def.label,
        completedAt: completed === true ? new Date() : null,
        documentId: documentId || null,
      },
      update: {
        ...(completed !== undefined && {
          completedAt: completed ? new Date() : null,
        }),
        ...(documentId !== undefined && { documentId: documentId || null }),
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error("Erro ao atualizar checklist:", error)
    return NextResponse.json({ error: "Erro ao atualizar checklist" }, { status: 500 })
  }
}
