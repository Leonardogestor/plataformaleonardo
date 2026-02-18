import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

const MIN_OCORRENCIAS = 2
const MIN_CONFIANCA = 0.6

/**
 * Sugestões automáticas baseadas em padrão histórico:
 * agrupa transações por padrão (ex.: primeira palavra da descrição),
 * verifica categoria mais frequente e sugere regra quando há consistência.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      select: { description: true, category: true },
    })

    const rules = await prisma.categoryRule.findMany({
      where: { userId: session.user.id },
      select: { pattern: true },
    })
    const existingPatterns = new Set(rules.map((r) => r.pattern.toLowerCase()))

    type Group = { category: string; count: number }[]
    const byPattern = new Map<string, Map<string, number>>()

    for (const t of transactions) {
      const desc = (t.description || "").trim()
      if (!desc || !t.category?.trim()) continue

      const firstWord = desc.toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9\u00c0-\u024f]/gi, "") || ""
      if (firstWord.length < 2) continue

      if (!byPattern.has(firstWord)) {
        byPattern.set(firstWord, new Map())
      }
      const catMap = byPattern.get(firstWord)!
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1)
    }

    const suggestions: {
      pattern: string
      suggestedCategory: string
      count: number
      confidence: number
    }[] = []

    for (const [pattern, catCounts] of byPattern) {
      if (existingPatterns.has(pattern)) continue

      const entries = Array.from(catCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)

      const total = entries.reduce((s, e) => s + e.count, 0)
      if (total < MIN_OCORRENCIAS) continue

      const top = entries[0]
      const confidence = top.count / total
      if (confidence < MIN_CONFIANCA) continue

      suggestions.push({
        pattern,
        suggestedCategory: top.category,
        count: total,
        confidence: Math.round(confidence * 100) / 100,
      })
    }

    suggestions.sort((a, b) => b.count - a.count)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Erro ao gerar sugestões:", error)
    return NextResponse.json(
      { error: "Erro ao gerar sugestões" },
      { status: 500 }
    )
  }
}
