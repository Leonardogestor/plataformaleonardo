import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { extractTextFromPdf } from "@/lib/document-extract"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    console.log(`[TEST] Processando arquivo: ${file.name} (${file.size} bytes)`)

    const buffer = Buffer.from(await file.arrayBuffer())
    console.log(`[TEST] Buffer criado: ${buffer.length} bytes`)

    const startTime = Date.now()
    const text = await extractTextFromPdf(buffer)
    const duration = Date.now() - startTime

    console.log(`[TEST] Extração concluída em ${duration}ms`)
    console.log(`[TEST] Texto extraído: ${text.length} caracteres`)

    return NextResponse.json({
      success: true,
      file: file.name,
      fileSize: file.size,
      extractedTextLength: text.length,
      extractedText: text.slice(0, 500), // Primeiros 500 caracteres
      duration: `${duration}ms`,
      preview: text.length > 0 ? text.slice(0, 200) : "VAZIO",
    })
  } catch (error) {
    console.error("[TEST] Erro:", error)
    return NextResponse.json(
      {
        error: "Erro ao testar extração",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
