import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import * as XLSX from "xlsx"

export const maxDuration = 60

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

const INVESTMENT_TYPES = ["STOCKS", "BONDS", "REAL_ESTATE", "FIXED_INCOME", "CRYPTO", "FUNDS", "INTERNATIONAL", "OTHER"] as const
type InvestmentType = typeof INVESTMENT_TYPES[number]

function mapInvestmentType(name: string, extra = ""): InvestmentType {
  const s = (name + " " + extra).toLowerCase()
  if (s.includes("tesouro") || s.includes("treasury")) return "BONDS"
  if (s.includes("ação") || s.includes("acoes") || s.includes("stock") || s.includes("bdr")) return "STOCKS"
  if (s.includes("fii") || s.includes("fundo imob") || s.includes("imovel") || s.includes("imóvel")) return "REAL_ESTATE"
  if (s.includes("fundo") || s.includes("fund") || s.includes("etf")) return "FUNDS"
  if (s.includes("cripto") || s.includes("bitcoin") || s.includes("eth")) return "CRYPTO"
  if (s.includes("cdb") || s.includes("lci") || s.includes("lca") || s.includes("renda fixa") || s.includes("debenture")) return "FIXED_INCOME"
  if (s.includes("inter") || s.includes("nasdaq") || s.includes("nyse")) return "INTERNATIONAL"
  return "OTHER"
}

function mapInstitution(name: string): string {
  const s = name.toLowerCase()
  if (s.includes("xp")) return "XP Investimentos"
  if (s.includes("nubank") || s.includes("nu invest")) return "Nu Invest"
  if (s.includes("rico")) return "Rico Investimentos"
  if (s.includes("btg")) return "BTG Pactual"
  if (s.includes("itau") || s.includes("itaú")) return "Itaú"
  if (s.includes("bradesco")) return "Bradesco"
  if (s.includes("santander")) return "Santander"
  if (s.includes("caixa")) return "Caixa"
  if (s.includes("banco do brasil") || s.includes("bb ")) return "Banco do Brasil"
  if (s.includes("inter")) return "Banco Inter"
  return name || "Desconhecida"
}

function parseBRNumber(raw: any): number {
  if (typeof raw === "number") return raw
  const s = String(raw ?? "0").replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function parseExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("Arquivo não contém planilhas")
  const worksheet = workbook.Sheets[sheetName]!
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][]

  if (rows.length < 2) throw new Error("Planilha sem dados suficientes")

  const headers = (rows[0] ?? []).map((h: any) => String(h).toLowerCase().trim())

  const idx = (terms: string[]) =>
    headers.findIndex((h) => terms.some((t) => h.includes(t)))

  const nameIdx    = idx(["nome", "ativo", "descricao", "name"])
  const typeIdx    = idx(["tipo", "type", "categoria", "category"])
  const amountIdx  = idx(["investido", "aplicado", "amount", "custo"])
  const valueIdx   = idx(["atual", "current", "saldo", "posicao", "posição"])
  const instIdx    = idx(["institu", "broker", "custodiante"])
  const dateIdx    = idx(["data", "date", "aquisicao", "aquisição"])
  const tickerIdx  = idx(["ticker", "codigo", "código", "symbol"])

  const investments = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? []
    if (row.every((c: any) => !c)) continue

    const name = String(row[nameIdx] ?? row[0] ?? "").trim()
    if (!name) continue

    const amount = parseBRNumber(amountIdx >= 0 ? row[amountIdx] : row[2])
    const currentValue = parseBRNumber(valueIdx >= 0 ? row[valueIdx] : (amountIdx >= 0 ? row[amountIdx] : row[2]))

    if (amount <= 0) continue

    const rawDate = dateIdx >= 0 ? row[dateIdx] : null
    let acquiredAt: string
    try {
      acquiredAt = rawDate ? new Date(String(rawDate)).toISOString().split("T")[0]! : new Date().toISOString().split("T")[0]!
    } catch {
      acquiredAt = new Date().toISOString().split("T")[0]!
    }

    investments.push({
      name,
      type: mapInvestmentType(String(row[typeIdx] ?? ""), name),
      amount,
      currentValue: currentValue > 0 ? currentValue : amount,
      institution: mapInstitution(String(row[instIdx] ?? "Desconhecida")),
      ticker: tickerIdx >= 0 && row[tickerIdx] ? String(row[tickerIdx]).trim() : undefined,
      acquiredAt,
    })
  }

  return investments
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const userId = session.user.id

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Falha ao ler o arquivo enviado" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `Arquivo excede o limite de 20MB (enviado: ${(file.size / 1024 / 1024).toFixed(1)}MB)` }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const isExcel = ["xlsx", "xls", "csv"].includes(ext) || file.type.includes("sheet") || file.type.includes("excel") || file.type === "text/csv"
  if (!isExcel) {
    return NextResponse.json({ error: "Formato não suportado. Envie .xlsx, .xls ou .csv" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let parsed: ReturnType<typeof parseExcel>
  try {
    parsed = parseExcel(buffer)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar planilha" },
      { status: 422 }
    )
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "Nenhum investimento identificado na planilha. Verifique se as colunas têm cabeçalhos como Nome, Valor Investido, Valor Atual." }, { status: 422 })
  }

  // Upsert direto no banco — sem chamadas HTTP circulares
  let imported = 0
  let updated = 0
  const errors: string[] = []

  for (const inv of parsed) {
    try {
      const existing = await prisma.investment.findFirst({
        where: {
          userId,
          name: { equals: inv.name, mode: "insensitive" },
          institution: { equals: inv.institution, mode: "insensitive" },
        },
        select: { id: true },
      })

      if (existing) {
        await prisma.investment.update({
          where: { id: existing.id },
          data: {
            amount: String(inv.amount),
            currentValue: String(inv.currentValue),
            type: inv.type,
            ticker: inv.ticker ?? null,
            acquiredAt: new Date(inv.acquiredAt),
          },
        })
        updated++
      } else {
        await prisma.investment.create({
          data: {
            userId,
            name: inv.name,
            type: inv.type,
            amount: String(inv.amount),
            currentValue: String(inv.currentValue),
            institution: inv.institution,
            ticker: inv.ticker ?? null,
            acquiredAt: new Date(inv.acquiredAt),
          },
        })
        imported++
      }
    } catch (err) {
      errors.push(`"${inv.name}": ${err instanceof Error ? err.message : "erro desconhecido"}`)
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    summary: { total: parsed.length, imported, updated, errors: errors.length },
    errors,
    message: `${imported} importado(s), ${updated} atualizado(s)${errors.length ? `, ${errors.length} erro(s)` : ""}.`,
  })
}
