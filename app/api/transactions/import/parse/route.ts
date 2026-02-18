import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { parseOfx } from "@/lib/parse-ofx"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())

    // OFX
    if (name.endsWith(".ofx")) {
      const content = buffer.toString("utf-8")
      const ofxTx = parseOfx(content)
      const transactions = ofxTx.map((t) => ({
        type: t.type,
        category: "Importado",
        amount: t.amount,
        description: t.description,
        date: `${t.date}T12:00:00.000Z`,
      }))
      return NextResponse.json({ format: "ofx", transactions })
    }

    // Excel (xlsx, xls)
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const wb = XLSX.read(buffer, { type: "buffer" })
      const firstSheet = wb.SheetNames[0]
      if (!firstSheet) {
        return NextResponse.json({ error: "Planilha vazia" }, { status: 400 })
      }
      const sheet = wb.Sheets[firstSheet]
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][]
      if (data.length < 2) {
        return NextResponse.json({ error: "Planilha sem dados. Use a primeira linha como cabeçalho." }, { status: 400 })
      }
      const headers = data[0].map((h, i) => String(h ?? "").trim() || `Col ${i + 1}`) as string[]
      const rows: Record<string, string>[] = data.slice(1).map((row) => {
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => {
          obj[h] = row[i] != null ? String(row[i]).trim() : ""
        })
        return obj
      })
      return NextResponse.json({ format: "xlsx", headers, rows })
    }

    return NextResponse.json(
      { error: "Formato não suportado. Use .ofx, .xlsx ou .xls" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Erro ao parsear arquivo:", error)
    return NextResponse.json({ error: "Erro ao processar arquivo" }, { status: 500 })
  }
}
